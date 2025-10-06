/**
 * 🧩 공용 리스트 스크립트 (commonUnifiedList.js)
 * -------------------------------------------------
 * 여러 페이지에서 공통으로 사용되는 리스트/CRUD/엑셀 기능을 제공.
 * 페이지별 설정은 initUnifiedList(config) 로 전달받는다.
 *
 * ✅ 지원 기능:
 *   - 검색 및 페이징 조회
 *   - 등록 / 수정 / 삭제
 *   - 상세보기 / 모달 관리
 *   - 엑셀 다운로드
 *   - ✅ JWT 토큰 자동 인증 (Authorization 헤더 자동 추가)
 *   - ✅ 안전한 체크박스 선택 / 단건 조회 / 예외처리 강화
 */

function initUnifiedList(config) {
  const {
    mode,
    apiUrl,
    tableBodySelector,
    paginationSelector,
    searchInputSelector,
    searchBtnSelector,
    addBtnSelector,
    modalId,
    saveBtnSelector,
    closeBtnSelector,
    checkAllSelector,
    deleteSelectedBtnSelector,
    detailModalId,
    detailFields,
    updateBtnSelector,
    excelBtnSelector,
    columns
  } = config;

  let currentPage = 0;
  const pageSize = 10;

  //------------------------------------------------------
  // 🧭 공용 유틸 함수
  //------------------------------------------------------
  const $ = sel => document.querySelector(sel);
  const $$ = sel => document.querySelectorAll(sel);

  // ✅ CSRF 헤더 자동설정 (Spring Security 대응)
  const csrfToken = document.querySelector("meta[name='_csrf']")?.content;
  const csrfHeader = document.querySelector("meta[name='_csrf_header']")?.content;

  /**
   * ✅ fetchOptions(method, body)
   *  모든 API 요청 시 필요한 공통 옵션을 생성.
   *  JWT 토큰을 자동으로 Authorization 헤더에 추가함.
   */
  const fetchOptions = (method, body) => {
    const opt = {
      method,
      headers: { "Content-Type": "application/json" }
    };

    if (csrfToken && csrfHeader) opt.headers[csrfHeader] = csrfToken;
    if (body) opt.body = JSON.stringify(body);

    const token = localStorage.getItem("token");
    if (token) opt.headers["Authorization"] = "Bearer " + token;

    return opt;
  };

  //------------------------------------------------------
  // 📋 리스트 조회 (GET /api/{mode}?page=&size=&search=)
  //------------------------------------------------------
  async function loadList(page = 0) {
    const search = $(searchInputSelector)?.value || "";
    const url = `${apiUrl}?page=${page}&size=${pageSize}&search=${encodeURIComponent(search)}`;

    try {
      const res = await fetch(url, fetchOptions("GET"));
      if (res.status === 401) {
        alert("세션이 만료되었습니다. 다시 로그인해주세요.");
        localStorage.clear();
        window.location.href = "/login";
        return;
      }
      if (!res.ok) throw new Error("데이터 조회 실패");

      const data = await res.json();
      renderTable(data.content || []);
      renderPagination(data.page, data.totalPages);
    } catch (err) {
      console.error(err);
      alert("데이터 조회 중 오류가 발생했습니다.");
    }
  }

  //------------------------------------------------------
  // 🧱 테이블 렌더링
  //------------------------------------------------------
  function renderTable(list) {
    const tbody = $(tableBodySelector);
    if (!tbody) return;
    tbody.innerHTML = "";

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${columns.length + 1}">데이터가 없습니다.</td></tr>`;
      return;
    }

    list.forEach(row => {
      const tr = document.createElement("tr");

      // ✅ 체크박스 열
      const chkTd = document.createElement("td");
      chkTd.innerHTML = `<input type="checkbox" value="${row.id}">`;
      tr.appendChild(chkTd);

      // ✅ 데이터 열
      columns.forEach(col => {
        const td = document.createElement("td");
        let val = row[col.key] ?? "";

        // ✅ 상세보기 클릭 가능 컬럼
        if (col.isDetailLink) {
          td.innerHTML = `<a href="#" data-id="${row.id}" class="detail-link">${val}</a>`;
        } else {
          td.textContent = val;
        }
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    // ✅ 상세 링크 클릭 이벤트 등록
    $$(".detail-link").forEach(a => {
      a.addEventListener("click", e => {
        e.preventDefault();
        const id = e.target.dataset.id;
        openDetailModal(id);
      });
    });
  }

  //------------------------------------------------------
  // 📄 페이징 렌더링 (<< < 1 2 3 4 5 > >>)
  //------------------------------------------------------
  //------------------------------------------------------
  // 📄 페이징 렌더링 (<< < 1 2 3 4 5 > >> 형태)
  //------------------------------------------------------
  function renderPagination(page, totalPages) {
    const container = $(paginationSelector);
    if (!container) return;
    container.innerHTML = "";

    if (totalPages <= 0) return;

    // ✅ 한 번에 보여줄 페이지 그룹 크기 (예: 5개씩)
    const groupSize = 5;
    const currentGroup = Math.floor(page / groupSize);
    const startPage = currentGroup * groupSize;
    const endPage = Math.min(startPage + groupSize, totalPages);

    //--------------------------------------------------
    // 🔹 페이지 버튼 생성 헬퍼
    //--------------------------------------------------
    const makeBtn = (text, disabled, click) => {
      const btn = document.createElement("button");
      btn.textContent = text;
      btn.disabled = disabled;
      if (!disabled) btn.addEventListener("click", click);
      container.appendChild(btn);
    };

    //--------------------------------------------------
    // ⏪ 맨앞 / 이전
    //--------------------------------------------------
    makeBtn("<<", page === 0, () => loadList(0));
    makeBtn("<", page === 0, () => loadList(page - 1));

    //--------------------------------------------------
    // 🔢 현재 그룹 페이지들 (1~5, 6~10 등)
    //--------------------------------------------------
    for (let i = startPage; i < endPage; i++) {
      const btn = document.createElement("button");
      btn.textContent = i + 1;
      if (i === page) btn.classList.add("active");
      btn.addEventListener("click", () => loadList(i));
      container.appendChild(btn);
    }

    //--------------------------------------------------
    // ⏩ 다음 / 마지막
    //--------------------------------------------------
    makeBtn(">", page >= totalPages - 1, () => loadList(page + 1));
    makeBtn(">>", page >= totalPages - 1, () => loadList(totalPages - 1));
  }


  //------------------------------------------------------
  // 🔍 검색 버튼
  //------------------------------------------------------
  $(searchBtnSelector)?.addEventListener("click", () => {
    currentPage = 0;
    loadList(currentPage);
  });

  //------------------------------------------------------
  // ➕ 등록 (POST)
  //------------------------------------------------------
  $(addBtnSelector)?.addEventListener("click", () => {
    $(modalId).style.display = "block";
  });

  $(saveBtnSelector)?.addEventListener("click", async () => {
    const data = {
      title: $("#titleInput").value,
      owner: $("#ownerInput").value
    };

    const res = await fetch(apiUrl, fetchOptions("POST", data));
    const result = await res.json();
    alert(result.status === "success" ? "등록 완료" : "등록 실패");
    $(modalId).style.display = "none";
    loadList();
  });

  //------------------------------------------------------
  // 🔍 상세 보기 (GET /api/{mode}/{id})
  //------------------------------------------------------
  async function openDetailModal(id) {
    try {
      const res = await fetch(`${apiUrl}/${id}`, fetchOptions("GET"));
      if (!res.ok) throw new Error("상세 조회 실패");

      const item = await res.json();
      if (!item) return alert("데이터를 찾을 수 없습니다.");

      $(detailFields.id).value = item.id;
      $(detailFields.title).value = item.title;
      $(detailFields.owner).value = item.owner;
      $(detailFields.regDate).value = item.regDate;

      $(detailModalId).style.display = "block";
    } catch (err) {
      console.error(err);
      alert("상세 조회 중 오류가 발생했습니다.");
    }
  }

  //------------------------------------------------------
  // ✏️ 수정 (PUT /api/{mode}/{id})
  //------------------------------------------------------
  $(updateBtnSelector)?.addEventListener("click", async () => {
    const id = $(detailFields.id).value;
    const data = {
      title: $(detailFields.title).value,
      owner: $(detailFields.owner).value
    };

    const res = await fetch(`${apiUrl}/${id}`, fetchOptions("PUT", data));
    const result = await res.json();
    alert(result.status === "updated" ? "수정 완료" : "수정 실패");
    $(detailModalId).style.display = "none";
    loadList(currentPage);
  });

  //------------------------------------------------------
  // ❌ 삭제 (DELETE /api/{mode})
  //------------------------------------------------------
  $(deleteSelectedBtnSelector)?.addEventListener("click", async () => {
    // ✅ 현재 테이블의 tbody 안에서 체크된 항목만 추출
    const checked = Array.from(
      document.querySelectorAll(`${tableBodySelector} input[type='checkbox']:checked`)
    ).map(chk => parseInt(chk.value));

    if (checked.length === 0) return alert("삭제할 항목을 선택하세요.");
    if (!confirm(`${checked.length}건을 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch(apiUrl, fetchOptions("DELETE", checked));
      const result = await res.json();
      alert(result.message || "삭제 완료");
      loadList(currentPage);
    } catch (err) {
      console.error(err);
      alert("삭제 중 오류가 발생했습니다.");
    }
  });

  //------------------------------------------------------
  // ✅ 전체선택 체크박스 (상단 체크박스 ↔ 개별 행 동기화)
  //------------------------------------------------------
  const checkAllEl = document.querySelector(checkAllSelector);

  // ✅ [1] 상단 체크박스 클릭 시 → 모든 행의 체크 상태 변경
  if (checkAllEl) {
    checkAllEl.addEventListener("change", e => {
      const checked = e.target.checked;
      document
        .querySelectorAll(`${tableBodySelector} input[type='checkbox']`)
        .forEach(chk => (chk.checked = checked));
    });
  }

  // ✅ [2] 개별 체크 시 → 전체선택 상태 자동 업데이트
  document.addEventListener("change", e => {
    if (e.target.matches(`${tableBodySelector} input[type='checkbox']`)) {
      const all = document.querySelectorAll(
        `${tableBodySelector} input[type='checkbox']`
      );
      const checked = document.querySelectorAll(
        `${tableBodySelector} input[type='checkbox']:checked`
      );
      const checkAll = document.querySelector(checkAllSelector);
      if (checkAll) checkAll.checked = all.length === checked.length;
    }
  });

  //------------------------------------------------------
  // ❎ 모달 닫기 버튼
  //------------------------------------------------------
  $$(closeBtnSelector).forEach(btn => {
    btn.addEventListener("click", e => {
      const targetId = e.target.dataset.close;
      if (targetId) $(`#${targetId}`).style.display = "none";
    });
  });

  //------------------------------------------------------
  // 🚀 초기 로드
  //------------------------------------------------------
  loadList();
}
