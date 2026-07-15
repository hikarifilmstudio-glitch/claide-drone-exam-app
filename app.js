/* 無人機學科測驗練習 App — 純前端，資料來自 data.js 的 QUESTION_DATA */
(function () {
  "use strict";

  // ===== 資料整理 =====
  const ALL = []; // 攤平後的所有題目，每題帶 chapter 欄位
  const BY_ID = {};
  QUESTION_DATA.forEach(function (ch) {
    ch.questions.forEach(function (q) {
      const item = { id: q.id, stem: q.stem, options: q.options, answer: q.answer, chapter: ch.chapter };
      ALL.push(item);
      BY_ID[q.id] = item;
    });
  });

  // ===== 使用者識別（localStorage）=====
  // 只是拿名字當資料夾分開存檔，沒有密碼、不做帳號驗證
  const USER_KEY = "droneExamCurrentUser";
  function cleanUserName(name) {
    return String(name || "").trim().slice(0, 20);
  }
  function getCurrentUser() {
    return cleanUserName(localStorage.getItem(USER_KEY));
  }
  function setCurrentUser(name) {
    localStorage.setItem(USER_KEY, cleanUserName(name));
  }

  // ===== 錯題本（localStorage，依目前使用者分開存）=====
  function wrongKey() { return "droneExamWrongIds:" + getCurrentUser(); }
  function loadWrong() {
    try {
      const arr = JSON.parse(localStorage.getItem(wrongKey()) || "[]");
      return Array.isArray(arr) ? arr.filter(function (id) { return BY_ID[id]; }) : [];
    } catch (e) { return []; }
  }
  function saveWrong(arr) { localStorage.setItem(wrongKey(), JSON.stringify(arr)); }
  function addWrong(id) {
    const arr = loadWrong();
    if (arr.indexOf(id) === -1) { arr.push(id); saveWrong(arr); }
  }
  function removeWrong(id) {
    saveWrong(loadWrong().filter(function (x) { return x !== id; }));
  }

  // ===== 工具 =====
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function $(id) { return document.getElementById(id); }

  const VIEWS = ["user", "home", "chapters", "exam-setup", "quiz", "result"];
  function showView(name) {
    VIEWS.forEach(function (v) {
      $("view-" + v).classList.toggle("hidden", v !== name);
    });
    window.scrollTo(0, 0);
  }

  // ===== 目前作答 session =====
  // mode: "practice"（立即回饋）或 "exam"（交卷才看成績）
  let session = null;

  function startSession(mode, questions, opts) {
    session = {
      mode: mode,
      questions: questions,
      index: 0,
      chosen: {},          // 題目 id -> 使用者選的選項字母
      fromWrongBook: !!(opts && opts.fromWrongBook),
      passPercent: (opts && opts.passPercent) || 80,
      label: (opts && opts.label) || ""
    };
    $("btn-submit-exam").classList.toggle("hidden", mode !== "exam");
    renderQuestion();
    showView("quiz");
  }

  // ===== 答題畫面 =====
  function renderQuestion() {
    const q = session.questions[session.index];
    const total = session.questions.length;
    $("quiz-progress").textContent =
      (session.label ? session.label + "　" : "") + "第 " + (session.index + 1) + " / " + total + " 題";
    $("quiz-chapter").textContent = q.chapter;
    $("quiz-stem").textContent = q.stem;

    const box = $("quiz-options");
    box.innerHTML = "";
    const chosen = session.chosen[q.id];
    const answered = chosen !== undefined;
    const isPractice = session.mode === "practice";

    ["A", "B", "C", "D"].forEach(function (key) {
      const btn = document.createElement("button");
      btn.className = "option-btn";
      btn.innerHTML = '<span class="key">(' + key + ')</span><span>' + escapeHtml(q.options[key]) + "</span>";
      if (isPractice) {
        if (answered) {
          btn.disabled = true;
          if (key === q.answer) btn.classList.add("correct");
          if (key === chosen && chosen !== q.answer) btn.classList.add("wrong");
        } else {
          btn.addEventListener("click", function () { answerPractice(q, key); });
        }
      } else { // exam：可反覆改答案，不顯示對錯
        if (key === chosen) btn.classList.add("chosen");
        btn.addEventListener("click", function () {
          session.chosen[q.id] = key;
          renderQuestion();
        });
      }
      box.appendChild(btn);
    });

    // 回饋區（只有練習模式用）
    const fb = $("quiz-feedback");
    if (isPractice && answered) {
      const ok = chosen === q.answer;
      fb.textContent = ok
        ? "答對了！"
        : "答錯了，正確答案是 (" + q.answer + ") " + q.options[q.answer];
      fb.className = "feedback " + (ok ? "ok" : "no");
    } else {
      fb.className = "feedback hidden";
    }

    $("btn-prev").disabled = session.index === 0;
    $("btn-next").disabled = session.index === total - 1;
    $("topbar-info").textContent = (session.index + 1) + " / " + total;
  }

  function answerPractice(q, key) {
    session.chosen[q.id] = key;
    if (key === q.answer) {
      if (session.fromWrongBook) removeWrong(q.id); // 錯題複習答對 → 移出錯題本
    } else {
      addWrong(q.id);
    }
    renderQuestion();
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // ===== 模擬考交卷 =====
  function submitExam() {
    const unanswered = session.questions.filter(function (q) {
      return session.chosen[q.id] === undefined;
    }).length;
    if (unanswered > 0 &&
        !confirm("還有 " + unanswered + " 題未作答，未作答視為錯誤。確定要交卷嗎？")) {
      return;
    }
    let correct = 0;
    session.questions.forEach(function (q) {
      if (session.chosen[q.id] === q.answer) {
        correct++;
      } else {
        addWrong(q.id);
      }
    });
    const total = session.questions.length;
    const percent = Math.round((correct / total) * 1000) / 10;
    const passed = percent >= session.passPercent;

    $("result-summary").innerHTML =
      '<p>答對 ' + correct + " / " + total + " 題</p>" +
      '<div class="big ' + (passed ? "pass" : "fail") + '">' + percent + "%</div>" +
      '<p>' + (passed ? "&#127881; 通過！" : "未達標，再接再厲") +
      "（及格門檻 " + session.passPercent + "%）</p>";

    // 逐題詳解
    const detail = $("result-detail");
    detail.innerHTML = "";
    detail.classList.add("hidden");
    $("btn-review").classList.remove("hidden");
    session.questions.forEach(function (q, i) {
      const chosen = session.chosen[q.id];
      const ok = chosen === q.answer;
      const div = document.createElement("div");
      div.className = "review-item " + (ok ? "correct-item" : "wrong-item");
      let html = '<p class="stem">' + (i + 1) + ". " + escapeHtml(q.stem) + "</p><ul>";
      ["A", "B", "C", "D"].forEach(function (key) {
        let cls = "";
        if (key === q.answer) cls = "is-answer";
        else if (key === chosen) cls = "is-chosen-wrong";
        html += '<li class="' + cls + '">(' + key + ") " + escapeHtml(q.options[key]) +
          (key === chosen ? "　&#8592; 你的答案" : "") + "</li>";
      });
      html += "</ul>";
      if (chosen === undefined) html += '<p class="meta">未作答</p>';
      html += '<p class="meta">' + escapeHtml(q.chapter) + "</p>";
      div.innerHTML = html;
      detail.appendChild(div);
    });

    showView("result");
    $("topbar-info").textContent = "";
    updateHomeCounts();
  }

  // ===== 首頁與各模式入口 =====
  function updateHomeCounts() {
    const wrongCount = loadWrong().length;
    $("wrong-count-desc").textContent =
      wrongCount > 0 ? "累積 " + wrongCount + " 題待複習" : "目前沒有錯題";
  }

  function buildHome() {
    let total = 0;
    const ul = $("chapter-list");
    ul.innerHTML = "";
    QUESTION_DATA.forEach(function (ch) {
      total += ch.questions.length;
      const li = document.createElement("li");
      li.innerHTML = "<span>" + escapeHtml(ch.chapter) + '</span><span class="count">' +
        ch.questions.length + " 題</span>";
      ul.appendChild(li);
    });
    $("home-total").textContent = "全題庫共 " + total + " 題，分 " + QUESTION_DATA.length + " 章";
    $("current-user-name").textContent = getCurrentUser();
    updateHomeCounts();
  }

  function buildChapterButtons() {
    const box = $("chapter-buttons");
    box.innerHTML = "";
    QUESTION_DATA.forEach(function (ch, i) {
      const btn = document.createElement("button");
      btn.innerHTML = escapeHtml(ch.chapter) + ' <span class="count">（' + ch.questions.length + " 題）</span>";
      btn.addEventListener("click", function () {
        const qs = ALL.filter(function (q) { return q.chapter === ch.chapter; });
        startSession("practice", qs, { label: "第" + "一二三四五六七八九十"[i] + "章" });
      });
      box.appendChild(btn);
    });
  }

  function goHome() {
    $("topbar-info").textContent = "";
    if (!getCurrentUser()) { showView("user"); return; } // 還沒輸入名字就先識別身份
    updateHomeCounts();
    showView("home");
  }

  // ===== 事件綁定 =====
  document.querySelectorAll(".mode-card").forEach(function (card) {
    card.addEventListener("click", function () {
      const mode = card.getAttribute("data-mode");
      if (mode === "chapter") {
        buildChapterButtons();
        showView("chapters");
      } else if (mode === "random") {
        startSession("practice", shuffle(ALL), { label: "隨機出題" });
      } else if (mode === "exam") {
        showView("exam-setup");
      } else if (mode === "wrong") {
        const ids = loadWrong();
        if (ids.length === 0) { alert("錯題本是空的，先去練習吧！"); return; }
        const qs = shuffle(ids.map(function (id) { return BY_ID[id]; }));
        startSession("practice", qs, { fromWrongBook: true, label: "錯題複習" });
      }
    });
  });

  document.querySelectorAll("[data-goto='home']").forEach(function (btn) {
    btn.addEventListener("click", goHome);
  });
  $("btn-home").addEventListener("click", function () {
    if (!$("view-quiz").classList.contains("hidden") &&
        !confirm("要離開目前的作答回到首頁嗎？")) return;
    goHome();
  });

  $("btn-prev").addEventListener("click", function () {
    if (session && session.index > 0) { session.index--; renderQuestion(); }
  });
  $("btn-next").addEventListener("click", function () {
    if (session && session.index < session.questions.length - 1) { session.index++; renderQuestion(); }
  });
  $("btn-quit").addEventListener("click", function () {
    if (confirm("確定結束這輪練習回到首頁嗎？")) goHome();
  });

  $("btn-start-exam").addEventListener("click", function () {
    let count = parseInt($("exam-count").value, 10);
    let pass = parseInt($("exam-pass").value, 10);
    if (!(count >= 1)) count = 50;
    if (count > ALL.length) count = ALL.length;
    if (!(pass >= 1 && pass <= 100)) pass = 80;
    $("exam-count").value = count;
    $("exam-pass").value = pass;
    startSession("exam", shuffle(ALL).slice(0, count), { passPercent: pass, label: "模擬考" });
  });
  $("btn-submit-exam").addEventListener("click", submitExam);

  $("btn-review").addEventListener("click", function () {
    $("result-detail").classList.toggle("hidden");
  });

  // ===== 使用者識別畫面 =====
  function confirmUserName() {
    const name = cleanUserName($("user-name").value);
    if (!name) { alert("請輸入名字或暱稱"); return; }
    setCurrentUser(name);
    buildHome();
    showView("home");
  }
  $("btn-user-start").addEventListener("click", confirmUserName);
  $("user-name").addEventListener("keydown", function (e) {
    if (e.key === "Enter") confirmUserName();
  });
  $("btn-switch-user").addEventListener("click", function () {
    $("user-name").value = getCurrentUser();
    showView("user");
    $("user-name").focus();
  });

  // ===== 啟動 =====
  if (getCurrentUser()) {
    buildHome();
    showView("home");
  } else {
    showView("user");
    $("user-name").focus();
  }
})();
