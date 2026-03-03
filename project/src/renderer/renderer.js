const editor = new toastui.Editor({
  el: document.querySelector('#editor'),
  height: '100%',
  initialEditType: 'wysiwyg',
  previewStyle: 'vertical'
});

let currentFilePath = null;
let isDirty = false;

document.getElementById('btn-select-folder').addEventListener('click', async () => {
  const folder = await window.api.selectFolder();
  if (folder) {
    const tree = await window.api.getTree(folder);
    const ul = document.getElementById('file-tree');
    ul.innerHTML = '';
    tree.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item.name;
      li.onclick = () => loadFile(item.path);
      ul.appendChild(li);
    });
  }
});

document.getElementById('btn-save').addEventListener('click', saveFile);

async function loadFile(filePath) {
  if (isDirty) {
    if (!confirm('保存されていない変更があります。破棄して別のファイルを開きますか？')) return;
  }
  const content = await window.api.readFile(filePath);
  editor.setMarkdown(content);
  currentFilePath = filePath;
  document.getElementById('current-file').textContent = filePath.split('\\').pop().split('/').pop();
  setDirty(false);
}

async function saveFile() {
  if (!currentFilePath) return;
  const content = editor.getMarkdown();
  await window.api.writeFile(currentFilePath, content);
  setDirty(false);
  alert('保存しました。');
}

function setDirty(state) {
  isDirty = state;
  document.getElementById('dirty-mark').textContent = state ? '(*未保存)' : '';
}

editor.on('change', () => {
  if (!isDirty) setDirty(true);
});

window.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    saveFile();
  }
});
