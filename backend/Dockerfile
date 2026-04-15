FROM python:3.12-slim

# Install system dependencies for GeoDjango (GDAL, GEOS, PROJ)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgdal-dev \
    libgeos-dev \
    libproj-dev \
    gdal-bin \
    postgresql-client \
    curl \
    netcat-openbsd \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libcairo2 \
    libjpeg-dev \
    libopenjp2-7-dev \
    && rm -rf /var/lib/apt/lists/*

# Set GDAL/GEOS environment variables for GeoDjango
ENV CPLUS_INCLUDE_PATH=/usr/include/gdal
ENV C_INCLUDE_PATH=/usr/include/gdal
ENV GDAL_LIBRARY_PATH=/usr/lib/x86_64-linux-gnu/libgdal.so
ENV GEOS_LIBRARY_PATH=/usr/lib/x86_64-linux-gnu/libgeos_c.so

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Make entrypoint executable
RUN chmod +x /app/scripts/entrypoint.sh

EXPOSE 8000

CMD ["/app/scripts/entrypoint.sh"]
