/**
 * 담당자 1:1 메일의 받는 사람 id(`rid`) — 메일 주소를 비밀 키로 암호화한 값.
 *
 * 왜 암호화인가: 링크에 고객사 이름·주소를 그대로 실으면 메일 전달·브라우저 기록·분석 도구로 퍼진다.
 * 그렇다고 id 표를 따로 두면 보내는 곳(ara·앱)마다 같은 사람에게 다른 id 를 주게 된다. 주소에서 계산하면
 * 표 없이 어디서 보내든 같은 값이 나오고, 키를 가진 서버(읽는 쪽)는 표를 뒤지지 않고 주소로 되돌린다.
 *
 * 모양: `k<키 버전>_<base32 소문자>` — `^[a-z0-9_]+$` 를 지킨다. 같은 주소·같은 키면 항상 같은 값이다
 * (그래야 `rid` 만으로 «이 사람이 몇 번 왔나»를 센다).
 *
 * 방식(SIV 구성, WebCrypto 만 — Node·Bun·브라우저 공통, 의존 0):
 *   키 둘 = HKDF-SHA256(secret) · iv = HMAC-SHA256(macKey, 주소) 앞 12바이트 · 본문 = AES-256-CTR(encKey, iv‖0000)
 *   rid = iv ‖ 본문. 풀 때 본문을 복호화해 HMAC 을 다시 계산하고 iv 와 같아야만 주소를 돌려준다 —
 *   손댄 값·다른 키로 만든 값은 엉뚱한 주소로 풀리지 않고 null 이다.
 *
 * 키는 이 패키지에 두지 않는다(공개 저장소). 부르는 쪽이 환경변수에서 읽어 넘긴다. 키가 새면 이미 나간
 * 링크의 주소가 모두 풀리므로, 분석 도구(GA4 등)에는 `rid` 를 가려서 보낸다.
 */
/** 비밀 키 최소 길이(글자). 짧은 키는 받지 않는다. */
export declare const RECIPIENT_ID_MIN_SECRET = 32;
/**
 * 받는 사람 메일 주소 → `rid`. 주소는 앞뒤 공백을 떼고 소문자로 맞춘 뒤 암호화한다.
 * 주소 모양이 아니거나 키가 짧으면 던진다. `version` 은 키를 바꿀 때만 올린다(기본 1).
 */
export declare function mailRecipientId({ email, secret, version, }: {
    email: string;
    secret: string;
    version?: number;
}): Promise<string>;
/**
 * `rid` → 받는 사람 메일 주소. `secrets` 는 «키 버전 → 비밀 키»(예 `{ 1: process.env.MAIL_RID_SECRET }`).
 * 모양이 다르거나, 그 버전의 키가 없거나, 손댄 값·다른 키로 만든 값이면 null — 던지지 않는다(주소창에서 온 값이라
 * 아무 글자나 들어올 수 있다).
 */
export declare function mailRecipientEmail({ rid, secrets, }: {
    rid: string | null | undefined;
    secrets: Readonly<Record<number, string | null | undefined>>;
}): Promise<string | null>;
