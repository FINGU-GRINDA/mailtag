/**
 * 받는 쪽 판정 — 도착한 UTM 값이 어떤 메일에서 왔는지 읽는다.
 *
 * 규칙이 바뀐 날(2026-10-15) 이전에 나간 링크는 지금도 클릭된다. 그래서 읽는 쪽은 새 값과 옛 값을
 * 함께 봐야 한다. 이 판정이 레포마다 다르면 같은 클릭이 레포마다 다른 채널로 집계된다 — 그래서 한 벌로 둔다.
 * 라벨 문구·화면 맵·저장 게이트처럼 레포 사정에 묶인 것은 여기 두지 않는다(README 참고).
 */
type Maybe = string | null | undefined;
/**
 * 2026-10-15 이전에는 세일즈 1:1 팔로업 전용 campaign 이 없어 팔로업 링크도 utm_campaign=coldmail 로
 * 나갔다. 그 링크의 utm_content 는 고객사 슬러그다. 그 슬러그 목록은 고객 정보라 이 공개 패키지에 두지
 * 않는다 — 소비 레포(비공개)가 자기 목록을 `slugs` 로 넘긴다. 새 팔로업은 campaign=followup 이라
 * 목록은 더 늘지 않는다.
 */
export type LegacyFollowupSlugs = readonly string[];
/** content 가 옛 팔로업 슬러그(그 자체 또는 `<슬러그>_…`)인가. */
export declare function isLegacyFollowupContent({ content, slugs, }: {
    content: Maybe;
    slugs: LegacyFollowupSlugs;
}): boolean;
/**
 * source=email 유입이 세일즈 1:1 팔로업인가 — campaign=followup, 또는 campaign=coldmail 이면서
 * content 가 옛 팔로업 슬러그(`slugs`). 나머지 source=email 은 콜드메일이다.
 */
export declare function isSalesFollowupMail(v: {
    source: Maybe;
    campaign: Maybe;
    content?: Maybe;
    slugs: LegacyFollowupSlugs;
}): boolean;
/**
 * 옛 1:1 팔로업 링크로 «도착한» 행인가 — source=email · campaign=coldmail · content 가 옛 슬러그.
 * content 는 도착 순간에만 실리고 이후 행은 content 없이 남으므로, 읽는 쪽은 이 판정으로 «옛 팔로업으로
 * 도착한 방문자» 를 먼저 모은 뒤 그 방문자의 content 없는 coldmail 행을 팔로업으로 본다.
 */
export declare function isLegacyFollowupArrival(v: {
    source: Maybe;
    campaign: Maybe;
    content: Maybe;
    slugs: LegacyFollowupSlugs;
}): boolean;
/**
 * 2026-10-15 이전 랜딩이 비회원에게 보낸 메일의 utm_source(전부 utm_medium=nudge 와 짝).
 * 라벨 맵이 이 값들을 lead 와 같은 이름으로 묶어 규칙이 바뀐 날 전후가 두 줄로 갈리지 않게 할 때 쓴다.
 */
export declare const LEGACY_LEAD_MAIL_SOURCES: readonly string[];
/**
 * 비회원 리드 메일(랜딩 무료도구 결과·자료 다운로드)의 UTM 인가 — 새 값과 옛 값을 모두 본다.
 *
 *   source=lead                                  (mailtag 2026-10-15 이후)
 *   campaign=leadmagnet·freetool_*               (mailtag lead)
 *   campaign=lead_magnet·free_tool_*             (같은 날 잠깐 lifecycle 로 나간 값)
 *   source=free-tool-email                       (이전 랜딩 무료도구 메일)
 *   source=*-email ∧ medium=nudge                (이전 랜딩 자료 메일, prompts-500-email·downloads-email)
 *   campaign=nudge ∧ source 가 있고 email 이 아님 (이전 자료 넛지, source=downloads·beauty-guide·
 *                                                 prompts-500·japan-buyer-prompts, medium=email)
 *
 * source=email ∧ campaign=nudge 는 옛 제품 메일(넛지)이라 리드가 아니다. 채널을 가르는 쪽은 제품 메일·
 * 콜드메일 판정보다 이것을 먼저 봐야 한다 — 그 판정들이 옛 값을 먼저 집어 간다. 값은 앞뒤 공백을 걷고
 * 소문자로 비교한다.
 */
export declare function isLeadMailUtm(v: {
    source: Maybe;
    medium: Maybe;
    campaign: Maybe;
}): boolean;
export {};
