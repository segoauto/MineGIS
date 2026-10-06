import json

from django.db.models import Count, Q, Sum
from django.contrib.auth.decorators import login_required
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from mining.models import District, Mandal, Mine
from mining.services import apply_user_district_filter
from users.permissions import CanAccessDistrictData, IsStateAdmin


def get_map_geometry(geometry):
    if not geometry:
        return None
    geographic_geometry = geometry.clone()
    # District and mandal shapefile coordinates are UTM 44N despite being stored as SRID 4326.
    geographic_geometry.srid = 32644
    geographic_geometry.transform(4326)
    return geographic_geometry


@api_view(['GET'])
@permission_classes([IsAuthenticated, CanAccessDistrictData])
def dashboard_view(request):
    district_qs = District.objects.all()
    district_options_qs = District.objects.all()
    mandal_qs = Mandal.objects.select_related('district')
    mine_qs = Mine.objects.select_related('district', 'mandal')
    district_id = request.query_params.get('district_id')
    mandal_id = request.query_params.get('mandal_id')
    selected_mandal = None

    if request.user.profile.role == 'DISTRICT_USER':
        district_qs = district_qs.filter(id=request.user.profile.district_id)
        district_options_qs = district_options_qs.filter(id=request.user.profile.district_id)
        mandal_qs = mandal_qs.filter(district=request.user.profile.district)
        mine_qs = mine_qs.filter(district=request.user.profile.district)
    elif district_id:
        if not district_id.isdecimal():
            return Response({'detail': 'Invalid district_id.'}, status=status.HTTP_400_BAD_REQUEST)
        if not district_qs.filter(id=district_id).exists():
            return Response({'detail': 'District not found.'}, status=status.HTTP_404_NOT_FOUND)
        district_qs = district_qs.filter(id=district_id)
        mandal_qs = mandal_qs.filter(district_id=district_id)
        mine_qs = mine_qs.filter(district_id=district_id)

    if mandal_id:
        if not mandal_id.isdecimal():
            return Response({'detail': 'Invalid mandal_id.'}, status=status.HTTP_400_BAD_REQUEST)
        selected_mandal = mandal_qs.filter(id=mandal_id).select_related('district').first()
        if not selected_mandal:
            return Response({'detail': 'Mandal not found.'}, status=status.HTTP_404_NOT_FOUND)
        mandal_qs = mandal_qs.filter(id=selected_mandal.id)
        mine_qs = mine_qs.filter(mandal_id=selected_mandal.id)
        district_qs = district_qs.filter(id=selected_mandal.district_id)

    total_districts = district_qs.count()
    total_mandals = mandal_qs.count()
    total_mines = mine_qs.count()
    mineral_breakdown = [
        {
            'mineral': row['mineral'] or 'Unspecified',
            'mine_count': row['mine_count'],
            'production': row['production'] or 0,
            'dispatch': row['dispatch'] or 0,
            'ets': row['ets'] or 0,
            'notice': row['notice'] or 0,
        }
        for row in mine_qs.values('mineral').annotate(
            mine_count=Count('id'),
            production=Sum('production'),
            dispatch=Sum('dispatch'),
            ets=Sum('ets'),
            notice=Sum('notice'),
        ).order_by('mineral')
    ]

    return Response({
        'total_districts': total_districts,
        'total_mandals': total_mandals,
        'total_mines': total_mines,
        'districts': [
            {'id': district.id, 'name': district.name}
            for district in district_options_qs.order_by('name')
        ],
        'selected_mandal': {
            'id': selected_mandal.id,
            'name': selected_mandal.name,
            'district_name': selected_mandal.district.name,
        } if selected_mandal else None,
        'district_breakdown': list(
            mine_qs.values('district__name').annotate(count=Count('id')).order_by('-count')
        ),
        'mineral_breakdown': mineral_breakdown,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, CanAccessDistrictData])
def districts_view(request):
    qs = District.objects.all().order_by('name')
    district_id = request.query_params.get('district_id')
    if request.user.profile.role == 'DISTRICT_USER':
        qs = qs.filter(id=request.user.profile.district_id)
    elif district_id:
        qs = qs.filter(id=district_id)
    districts = list(qs)
    geometries_by_name = {
        district.name.casefold(): district.geom
        for district in districts
        if district.geom
    }
    results = []
    for district in districts:
        source_geometry = district.geom
        if source_geometry is None and district.name.casefold() == 'mahbubnagar':
            source_geometry = geometries_by_name.get('mahabubnagar')
        geographic_geometry = get_map_geometry(source_geometry)
        results.append({
            'id': district.id,
            'name': district.name,
            'area': district.area,
            'bounds': list(geographic_geometry.extent) if geographic_geometry else None,
            'geometry': json.loads(geographic_geometry.json) if geographic_geometry else None,
        })
    return Response({
        'results': results,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, CanAccessDistrictData])
def mandals_view(request):
    qs = Mandal.objects.select_related('district').order_by('district__name', 'name')
    if request.user.profile.role == 'DISTRICT_USER':
        qs = qs.filter(district=request.user.profile.district)

    district_id = request.query_params.get('district_id')
    if district_id and request.user.profile.role == 'STATE_ADMIN':
        qs = qs.filter(district_id=district_id)

    results = []
    for mandal in qs:
        geographic_geometry = get_map_geometry(mandal.geom)
        results.append({
            'id': mandal.id,
            'name': mandal.name,
            'district': mandal.district_id,
            'district_name': mandal.district.name,
            'bounds': list(geographic_geometry.extent) if geographic_geometry else None,
            'geometry': json.loads(geographic_geometry.json) if geographic_geometry else None,
        })
    return Response({'results': results})


@api_view(['GET'])
@permission_classes([IsAuthenticated, CanAccessDistrictData])
def mines_view(request):
    qs = Mine.objects.select_related('district', 'mandal').order_by('company')
    if request.user.profile.role == 'DISTRICT_USER':
        qs = qs.filter(district=request.user.profile.district)

    district_id = request.query_params.get('district_id')
    if district_id and request.user.profile.role == 'STATE_ADMIN':
        qs = qs.filter(district_id=district_id)

    mandal_id = request.query_params.get('mandal_id')
    if mandal_id:
        qs = qs.filter(mandal_id=mandal_id)

    mineral = request.query_params.get('mineral')
    if mineral:
        qs = qs.filter(mineral__icontains=mineral)

    payload = [{
        'id': mine.id,
        'district': mine.district_id,
        'district_name': mine.district.name,
        'mandal': mine.mandal_id,
        'mandal_name': mine.mandal.name if mine.mandal else mine.mandal_name,
        'company': mine.company,
        'address': mine.address,
        'mineral': mine.mineral,
        'mineral_type': mine.mineral_type,
        'survey_number': mine.survey_number,
        'land_type': mine.land_type,
        'production': mine.production,
        'dispatch': mine.dispatch,
        'ets': mine.ets,
        'notice': mine.notice,
        'reg_from': mine.reg_from,
        'reg_to': mine.reg_to,
    } for mine in qs]
    return Response({'results': payload})


@api_view(['GET'])
@permission_classes([IsAuthenticated, CanAccessDistrictData])
def search_view(request):
    query = (request.query_params.get('q') or '').strip()
    if not query:
        return Response({'results': []})

    district_qs = District.objects.filter(name__icontains=query)
    mandal_qs = Mandal.objects.filter(name__icontains=query)
    mine_qs = Mine.objects.filter(
        Q(company__icontains=query) | Q(mineral__icontains=query) | Q(survey_number__icontains=query)
    )

    if request.user.profile.role == 'DISTRICT_USER':
        district_qs = district_qs.filter(id=request.user.profile.district_id)
        mandal_qs = mandal_qs.filter(district=request.user.profile.district)
        mine_qs = mine_qs.filter(district=request.user.profile.district)

    return Response({
        'districts': [{'id': d.id, 'name': d.name} for d in district_qs[:10]],
        'mandals': [{'id': m.id, 'name': m.name, 'district_name': m.district.name} for m in mandal_qs[:10]],
        'mines': [{'id': m.id, 'company': m.company, 'district_name': m.district.name, 'mineral': m.mineral} for m in mine_qs[:10]],
    })
