"""Fetch the pinned, redistributable Tesseract browser runtime and RU/KZ data."""
import pathlib, subprocess, tarfile, tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'dist' / 'vendor' / 'ocr'
OUT.mkdir(parents=True, exist_ok=True)
(OUT / 'lang').mkdir(exist_ok=True)

def download(url, path):
    if path.exists() and path.stat().st_size > 100:
        return
    subprocess.run(['curl', '--fail', '--location', '--retry', '2', '--silent', '--show-error', url, '--output', str(path)], check=True)

with tempfile.TemporaryDirectory() as tmp:
    for package in ['tesseract.js', 'tesseract.js-core']:
        archive = pathlib.Path(tmp) / (package + '.tgz')
        download(f'https://registry.npmjs.org/{package}/-/{package}-7.0.0.tgz', archive)
        with tarfile.open(archive) as tar:
            for member in tar.getmembers():
                name = pathlib.PurePosixPath(member.name).name
                runtime = name in ['tesseract.min.js', 'worker.min.js'] and '/dist/' in member.name
                core = package.endswith('-core') and name.startswith('tesseract-core') and name.endswith('lstm.wasm.js')
                license_file = name.lower().startswith('license') and member.isfile()
                if member.isfile() and (runtime or core or license_file):
                    target = OUT / (package + '-LICENSE' if license_file else name)
                    target.write_bytes(tar.extractfile(member).read())
    for lang in ['rus', 'kaz']:
        download(f'https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/main/{lang}.traineddata', OUT / 'lang' / f'{lang}.traineddata')
(OUT / 'NOTICE.txt').write_text('Tesseract.js 7.0.0 and tesseract.js-core 7.0.0: Apache License 2.0.\nLanguage data: tesseract-ocr/tessdata_fast (rus, kaz), Apache License 2.0.\nSources: https://github.com/naptha/tesseract.js and https://github.com/tesseract-ocr/tessdata_fast\n', encoding='utf-8')
print('OCR assets:', sum(p.stat().st_size for p in OUT.rglob('*') if p.is_file()), 'bytes')
