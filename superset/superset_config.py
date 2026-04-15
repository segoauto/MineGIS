import os

# Superset Governance & Security Config for MineGIS-TS
FEATURE_FLAGS = {
    "EMBEDDED_DASHBOARD": True,
    "DYNAMIC_PLUGINS": True,
}

# The SQLAlchemy connection string to the metadata database
# We are using the main app DB for simplicity in this dev environment
SQLALCHEMY_DATABASE_URI = os.environ.get("SUPERSET_DB_URI")

# Secret key for encrypting data in the metadata database
SECRET_KEY = os.environ.get("SUPERSET_SECRET_KEY")

# Flask-WTF Secret Key
WTF_CSRF_ENABLED = False # Disabled for dev/embedded ease
PUBLIC_ROLE_LIKE = "Gamma"

# Enable CORS for frontend integration
ENABLE_CORS = True
CORS_OPTIONS = {
    'supports_credentials': True,
    'allow_headers': ['*'],
    'resources': ['*'],
    'origins': ['*'],
}

# Allow embedding in the MineGIS portal
HTTP_HEADERS = {"X-Frame-Options": "ALLOWALL"}
SESSION_COOKIE_SAMESITE = None # Allow cross-site cookies for embedding
