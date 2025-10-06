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
        // 더미 데이터 생성
        for (int i = 1; i <= 100; i++) {
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
        List<Map<String, Object>> filtered = new ArrayList<>(mockList);

        if (search != null && !search.isEmpty()) {
            filtered.removeIf(row ->
                    !row.get("title").toString().contains(search) &&
                    !row.get("owner").toString().contains(search)
            );
        }

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
    // 🔎 단건 조회 (상세 보기 - DB 조회한 것처럼)
    // ============================================================
    @GetMapping("/{id}")
    public ResponseEntity<?> getDetail(@PathVariable int id) {
        Optional<Map<String, Object>> found = mockList.stream()
                .filter(m -> (int) m.get("id") == id)
                .findFirst();

        if (found.isPresent()) {
            return ResponseEntity.ok(found.get());
        } else {
            return ResponseEntity.status(404)
                    .body(Map.of("error", "해당 ID의 데이터가 존재하지 않습니다."));
        }
    }

    // ============================================================
    // ➕ 등록
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
    // ✏️ 수정
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
    // ❌ 삭제 (다중 삭제)
    // ============================================================
    @DeleteMapping
    public Map<String, Object> deleteItems(@RequestBody List<Integer> ids) {
        mockList.removeIf(m -> ids.contains(m.get("id")));
        return Map.of("status", "deleted", "count", ids.size());
    }

    // ============================================================
    // 📊 엑셀 다운로드 (샘플 CSV 응답)
    // ============================================================
    @GetMapping("/excel")
    public ResponseEntity<byte[]> downloadExcel(@RequestParam(required = false) String search) {
        StringBuilder csv = new StringBuilder("id,title,owner,regDate\n");
        mockList.forEach(item -> csv.append(
                item.get("id") + "," +
                item.get("title") + "," +
                item.get("owner") + "," +
                item.get("regDate") + "\n"
        ));

        byte[] bytes = csv.toString().getBytes();

        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=p01a04_list.csv")
                .header("Content-Type", "text/csv; charset=UTF-8")
                .body(bytes);
    }
}
