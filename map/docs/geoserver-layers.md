# GeoServer layer inventory

This document reflects the live GeoServer configuration currently running at http://localhost:8082/geoserver and the Mining workspace `Mining_WS`.

## Verified workspace

- Workspace: `Mining_WS`
- GeoServer URL: `http://localhost:8082/geoserver`
- WMS endpoint: `http://localhost:8082/geoserver/Mining_WS/wms`
- WFS endpoint: `http://localhost:8082/geoserver/Mining_WS/wfs`

## Published layers

| Layer name | Workspace | Geometry type | CRS | Purpose | WMS endpoint | WFS endpoint |
| --- | --- | --- | --- | --- | --- | --- |
| Districts | Mining_WS | Polygon | EPSG:4326 | District boundary display and filtering | http://localhost:8082/geoserver/Mining_WS/wms | http://localhost:8082/geoserver/Mining_WS/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=Mining_WS:Districts |
| Mandals | Mining_WS | Polygon | EPSG:4326 | Mandal boundary display | http://localhost:8082/geoserver/Mining_WS/wms | http://localhost:8082/geoserver/Mining_WS/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=Mining_WS:Mandals |
| Mines | Mining_WS | Polygon | EPSG:4326 | Mining area polygons and attributes | http://localhost:8082/geoserver/Mining_WS/wms | http://localhost:8082/geoserver/Mining_WS/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=Mining_WS:Mines |
| State | Mining_WS | Polygon | EPSG:4326 | State-level boundary context | http://localhost:8082/geoserver/Mining_WS/wms | http://localhost:8082/geoserver/Mining_WS/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=Mining_WS:State |

## Notes

- These are the actual layer names published in the running GeoServer workspace.
- The layer list was verified from the running `Mining_WS` WMS capabilities.
- No additional mining feature layers were currently exposed under the `Mining_WS` workspace beyond the verified set.
- The application should use these published names and not invent alternate layer names.
