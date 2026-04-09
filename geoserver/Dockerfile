FROM docker.osgeo.org/geoserver:2.25.1

ENV GEOSERVER_DATA_DIR=/opt/geoserver_data \
    INSTALL_EXTENSIONS=false \
    SKIP_DEMO_DATA=true \
    JAVA_OPTS="-Xms512m -Xmx1536m -XX:+UseG1GC -Dgeoserver.csrf.disabled=true"

# Create data directory
RUN mkdir -p /opt/geoserver_data

EXPOSE 8080
