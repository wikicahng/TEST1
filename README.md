# VROID DESIGN ARCHIVE V2

這一版已將作品內容從 `index.html` 分離到 `data/works.json`。

## 上傳 GitHub Pages

把此資料夾內所有檔案上傳並覆蓋 Repository 根目錄：

- `index.html`
- `css/`
- `js/`
- `data/`
- `assets/`

## 新增作品

1. 將圖片或影片放入 `assets/`。
2. 開啟 `data/works.json`。
3. 在 `background.works` 或 `character.works` 陣列加入一筆資料。

圖片範例：

```json
{
  "id": "new-background",
  "title": "新背景",
  "englishTitle": "NEW BACKGROUND",
  "category": "BACKGROUND DESIGN",
  "tag": "BACKGROUND / 04",
  "media": {
    "type": "image",
    "src": "assets/new-background.jpg",
    "alt": "新背景"
  },
  "description": "作品介紹。",
  "specs": [
    {"label": "STYLE", "value": "科技・極簡"},
    {"label": "MOOD", "value": "明亮・清晰"}
  ]
}
```

影片範例：

```json
{
  "media": {
    "type": "video",
    "src": "assets/new-costume.mp4",
    "poster": "assets/new-costume-cover.jpg",
    "alt": "新服裝展示影片",
    "autoplay": true,
    "loop": true,
    "muted": true
  }
}
```

## 注意

- JSON 最後一筆後面不能加逗號。
- GitHub Pages 可正常讀取 JSON。
- 直接雙擊 `index.html` 時，瀏覽器可能因安全限制無法讀取 JSON。建議使用本機伺服器測試：
  - Python：`python -m http.server 8000`
  - 然後開啟 `http://localhost:8000`
- 每次更新若手機仍顯示舊版，可調整 `index.html` 中 CSS／JS 的版本號。
