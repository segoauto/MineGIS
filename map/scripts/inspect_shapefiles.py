import shapefile
from pathlib import Path

paths = [
    Path(r'c:\Users\ADMIN\Veeresh\Projects\Mining\data\shapefiles\Districts.shp'),
    Path(r'c:\Users\ADMIN\Veeresh\Projects\Mining\data\shapefiles\Mandals.shp'),
    Path(r'c:\Users\ADMIN\Veeresh\Projects\Mining\data\shapefiles\Mines.shp'),
    Path(r'c:\Users\ADMIN\Veeresh\Projects\Mining\data\shapefiles\MinesPointFinal.shp'),
]

for path in paths:
    sf = shapefile.Reader(str(path))
    print('FILE:', path.name)
    print('TYPE:', sf.shapeTypeName)
    print('FIELDS:')
    for field in sf.fields[1:]:
        print('  ', field)
    print('RECORD_COUNT:', len(sf))
    if len(sf):
        rec = dict(zip([f[0] for f in sf.fields[1:]], sf.record(0)))
        print('SAMPLE_RECORD:', rec)
    print('---')
