package com.mynova.app.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * 📋 P01A04ApiController - 공용 리스트 페이지용 REST API
 *
 * ✅ 역할:
 *   - /api/p01a04 → 목록 조회 / 등록 / 수정 / 삭제 / 엑셀 다운로드
 * ✅ JS 연동:
 *   commonUnifiedList.js 의 initUnifiedList() 와 1:1 매칭됨
 */
@RestController
@RequestMapping("/api/p01a04")
public class P01A04ApiController {

    /**
     * ✅ 임시 데이터 저장용 (테스트용)
     * 실제로는 Service/DB 연동으로 교체 예정
     */
    private final List<Map<String, Object>> mockList = new ArrayList<>();

    public P01A04ApiController() {
        // 더미 데이터
        for (int i = 1; i <= 23; i++) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", i);
            item.put("title", "보고서 " + i);
            item.put("owner", "홍길동");
            item.put("regDate", "2025-10-06");
            mockList.add(item);
        }
    }

    // ============================================================
    // 🔍 리스트 조회 (검색 + 페이징)
    // ============================================================
    @GetMapping
    public Map<String, Object> getList(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search
    ) {
        // 🔎 검색 필터
        List<Map<String, Object>> filtered = new ArrayList<>(mockList);
        if (search != null && !search.isEmpty()) {
            filtered.removeIf(row ->
                    !row.get("title").toString().contains(search) &&
                    !row.get("owner").toString().contains(search)
            );
        }

        // 📄 페이징 처리
        int start = page * size;
        int end = Math.min(start + size, filtered.size());
        List<Map<String, Object>> paged = filtered.subList(Math.min(start, end), end);

        Map<String, Object> result = new HashMap<>();
        result.put("content", paged);
        result.put("page", page);
        result.put("totalPages", (int) Math.ceil((double) filtered.size() / size));
        return result;
    }

    // ============================================================
    // ➕ 등록 (POST /api/p01a04)
    // ============================================================
    @PostMapping
    public Map<String, Object> addItem(@RequestBody Map<String, Object> request) {
        int newId = mockList.stream()
                .mapToInt(m -> (int) m.get("id"))
                .max()
                .orElse(0) + 1;

        request.put("id", newId);
        request.putIfAbsent("regDate", "2025-10-06");
        mockList.add(request);

        return Map.of("status", "success", "id", newId);
    }

    // ============================================================
    // ✏️ 수정 (PUT /api/p01a04/{id})
    // ============================================================
    @PutMapping("/{id}")
    public Map<String, Object> updateItem(@PathVariable int id, @RequestBody Map<String, Object> request) {
        Optional<Map<String, Object>> found = mockList.stream()
                .filter(m -> (int) m.get("id") == id)
                .findFirst();

        if (found.isPresent()) {
            Map<String, Object> item = found.get();
            item.put("title", request.get("title"));
            item.put("owner", request.get("owner"));
            return Map.of("status", "updated");
        }

        return Map.of("status", "not_found");
    }

    // ============================================================
    // ❌ 삭제 (DELETE /api/p01a04)
    // ============================================================
    @DeleteMapping
    public Map<String, Object> deleteItems(@RequestBody List<Integer> ids) {
        mockList.removeIf(m -> ids.contains(m.get("id")));
        return Map.of("status", "deleted", "count", ids.size());
    }

    // ============================================================
    // 📊 엑셀 다운로드 (GET /api/p01a04/excel)
    // ============================================================
    @GetMapping("/excel")
    public ResponseEntity<byte[]> downloadExcel(@RequestParam(required = false) String search) {
        // ⚙️ 실제 구현에서는 Apache POI 등으로 파일 생성
        String dummy = "id,title,owner,regDate\n1,테스트,홍길동,2025-10-06\n";
        byte[] bytes = dummy.getBytes();

        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=p01a04_list.csv")
                .header("Content-Type", "text/csv; charset=UTF-8")
                .body(bytes);
    }
}
