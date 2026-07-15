# 無人機學科測驗題庫練習 App

台灣遙控無人機專業操作證學科測驗的隨機考題練習工具。純前端靜態網頁，無需安裝任何東西、可完全離線使用。

## 怎麼開啟

**直接雙擊 `index.html` 用瀏覽器打開就能用。**

題庫已內嵌在 `data.js`（不走 fetch），所以用 `file://` 直接開啟不會有 CORS 問題，離線也能跑。

## 功能

| 模式 | 說明 |
| :-- | :-- |
| 依章節練習 | 選一章逐題練習，選答後立即顯示對錯與正解，可上一題/下一題 |
| 隨機出題 | 全題庫 588 題打亂順序練習，同樣立即回饋 |
| 模擬考模式 | 隨機抽題（預設 40 題、及格門檻 70%，皆可調），交卷才顯示成績與逐題詳解 |
| 複習錯題本 | 只出你答錯過的題目；複習時答對就自動移出錯題本 |

錯題紀錄存在瀏覽器 localStorage，換瀏覽器或清除瀏覽資料會重置。

## 題庫

共 588 題，分 4 章：

- 第一章 民用航空法及相關法規（146 題）
- 第二章 基礎飛行原理（234 題）
- 第三章 氣象（129 題）
- 第四章 緊急處置與飛行決策（79 題）

## 檔案結構

```
index.html   主頁面
style.css    樣式（RWD，手機/桌面皆可用）
app.js       全部邏輯
data.js      內嵌題庫（由 data/questions.json 自動產生，勿手動編輯）
data/questions.json   原始題庫資料
```

## 題庫更新方式

若日後題庫有更新，改 `data/questions.json` 後重新產生 `data.js`：

```bash
cd /Users/xinye_aiagent_01/claide-drone-exam-app
python3 -c "
import json
d=json.load(open('data/questions.json'))
with open('data.js','w',encoding='utf-8') as f:
    f.write('// 自動產生：來源 data/questions.json（勿手動編輯）\n')
    f.write('const QUESTION_DATA = ')
    json.dump(d,f,ensure_ascii=False,indent=1)
    f.write(';\n')
"
```
