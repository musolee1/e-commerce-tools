import re

# Read the file
with open('app/dashboard/instagram/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove lines containing tag-related code (but keep the file structure)
# Remove tag input section
content = re.sub(r'<div>.*?Kullanıcı Etiketle.*?</div>', '', content, flags=re.DOTALL)

# Remove tag display sections
content = re.sub(r'{userTags\.length > 0 && \(.*?\)\}', '', content, flags=re.DOTALL)

# Remove remaining userTags references
content = re.sub(r'userTags\.map\([^)]+\).*?\)', '', content)
content = re.sub(r'setUserTags\([^)]+\)', '', content)
content = re.sub(r'newTagUsername', 'locationId', content)
content = re.sub(r'setNewTagUsername', 'setLocationId', content)

# Write back
with open('app/dashboard/instagram/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done!")
