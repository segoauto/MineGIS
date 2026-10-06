const GEOSERVER_BASE_URL = import.meta.env.VITE_GEOSERVER_URL || 'http://localhost:8082/geoserver';
const GEOSERVER_WORKSPACE = import.meta.env.VITE_GEOSERVER_WORKSPACE || 'Mining_WS';

export const geoserverConfig = {
  baseUrl: GEOSERVER_BASE_URL,
  workspace: GEOSERVER_WORKSPACE,
  layers: {
    districts: { name: 'Districts', title: 'Districts', visible: true },
    mandals: { name: 'Mandals', title: 'Mandals', visible: true },
    mines: { name: 'Mines', title: 'Mining Areas', visible: true },
    state: { name: 'State', title: 'State Boundary', visible: true }
  },
  wmsUrl: `${GEOSERVER_BASE_URL}/${GEOSERVER_WORKSPACE}/wms`,
  wfsUrl: `${GEOSERVER_BASE_URL}/${GEOSERVER_WORKSPACE}/ows`
};
