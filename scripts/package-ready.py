"""Package the complete local MVP and evaluation source, excluding transient state."""
from pathlib import Path
import zipfile,os,sys
root=Path(__file__).resolve().parents[1]
output=Path(sys.argv[1]).expanduser().resolve() if len(sys.argv)>1 else root.parent.parent/'IZ_SafeNet_KZ_Ready.zip'
temp=output.with_suffix('.new.zip');count=0
with zipfile.ZipFile(temp,'w',zipfile.ZIP_DEFLATED) as archive:
 for path in sorted(root.rglob('*')):
  if not path.is_file():continue
  rel=path.relative_to(root)
  if any(p in {'.git','artifacts','node_modules','__pycache__','.DS_Store'} for p in rel.parts) or str(rel).startswith('.openai/local') or path.suffix in {'.gz','.tgz','.zip'}:continue
  archive.write(path,'IZ_SafeNet_KZ/'+str(rel));count+=1
os.replace(temp,output)
print(f'{count} files, {output.stat().st_size} bytes: {output}')
