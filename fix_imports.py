import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # 1. Remove try-except blocks for imports in profile.py and similar
    # We'll just manually replace the known blocks in profile.py for safety
    if filepath.endswith('profile.py'):
        content = re.sub(
            r'try:\s*from common\.responses import success_response, error_response\s*from common\.errors import ValidationError, NotFoundError\s*from common\.auth import require_auth, get_user_claims\s*from common\.logging import get_logger\s*from common\.config import config\s*except ImportError:\s*from services\.api\.common\.responses import success_response, error_response\s*from services\.api\.common\.errors import ValidationError, NotFoundError\s*from services\.api\.common\.auth import require_auth, get_user_claims\s*from services\.api\.common\.logging import get_logger\s*from services\.api\.common\.config import config',
            'from api.common.responses import success_response, error_response\nfrom api.common.errors import ValidationError, NotFoundError\nfrom api.common.auth import require_auth, get_user_claims\nfrom api.common.logging import get_logger\nfrom api.common.config import config',
            content, flags=re.MULTILINE
        )
        content = re.sub(
            r'try:\s*from models import \(\s*CropStage,\s*Role,\s*FarmerProfile,\s*CitizenProfile,\s*FarmerProfileInput,\s*CitizenProfileInput,\s*\)\s*except ImportError:\s*from services\.api\.models import \(\s*CropStage,\s*Role,\s*FarmerProfile,\s*CitizenProfile,\s*FarmerProfileInput,\s*CitizenProfileInput,\s*\)',
            'from api.models import (\n    CropStage,\n    Role,\n    FarmerProfile,\n    CitizenProfile,\n    FarmerProfileInput,\n    CitizenProfileInput,\n)',
            content, flags=re.MULTILINE
        )

    # 2. General replacements for all files
    content = re.sub(r'^from common\.', 'from api.common.', content, flags=re.MULTILINE)
    content = re.sub(r'^from common import ', 'from api.common import ', content, flags=re.MULTILINE)
    content = re.sub(r'^import common\.', 'import api.common.', content, flags=re.MULTILINE)
    
    content = re.sub(r'(\s+)from common\.', r'\1from api.common.', content)
    content = re.sub(r'(\s+)from common import ', r'\1from api.common import ', content)
    content = re.sub(r'(\s+)import common\.', r'\1import api.common.', content)

    content = re.sub(r'^from models import ', 'from api.models import ', content, flags=re.MULTILINE)
    content = re.sub(r'(\s+)from models import ', r'\1from api.models import ', content)

    # 3. Replace incorrect services.* imports
    content = re.sub(r'from services\.api\.', 'from api.', content)
    content = re.sub(r'import services\.api\.', 'import api.', content)
    content = re.sub(r'from services\.ingest\.', 'from ingest.', content)
    content = re.sub(r'import services\.ingest\.', 'import ingest.', content)
    content = re.sub(r'from services\.ingest import ', 'from ingest import ', content)

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

def main():
    services_dir = r"D:\BharatBuilds\services"
    for root, dirs, files in os.walk(services_dir):
        for file in files:
            if file.endswith('.py'):
                process_file(os.path.join(root, file))

if __name__ == "__main__":
    main()
