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
export const RECIPIENT_ID_MIN_SECRET = 32;
const IV_BYTES = 12;
const MAX_EMAIL = 254;
const B32 = "abcdefghijklmnopqrstuvwxyz234567";
const RID_SHAPE = /^k([1-9][0-9]{0,2})_([a-z2-7]+)$/;
const enc = new TextEncoder();
function b32encode(bytes) {
    let out = "";
    let bits = 0;
    let acc = 0;
    for (const byte of bytes) {
        acc = ((acc << 8) | byte) & 0x1fff;
        bits += 8;
        while (bits >= 5) {
            bits -= 5;
            out += B32[(acc >>> bits) & 31];
        }
    }
    if (bits > 0)
        out += B32[(acc << (5 - bits)) & 31];
    return out;
}
function b32decode(text) {
    const out = [];
    let bits = 0;
    let acc = 0;
    for (const ch of text) {
        const v = B32.indexOf(ch);
        if (v < 0)
            return null;
        acc = ((acc << 5) | v) & 0xfff;
        bits += 5;
        if (bits >= 8) {
            bits -= 8;
            out.push((acc >>> bits) & 0xff);
        }
    }
    // 남은 자투리 비트는 0 이어야 한다 — 같은 주소가 두 가지 글자열로 적히지 않게.
    if (bits >= 5 || (acc & ((1 << bits) - 1)) !== 0)
        return null;
    return new Uint8Array(out);
}
async function keysOf(secret) {
    if (typeof secret !== "string" || secret.length < RECIPIENT_ID_MIN_SECRET) {
        throw new Error(`mailtag: rid 비밀 키는 ${RECIPIENT_ID_MIN_SECRET}자 이상이어야 한다`);
    }
    const subtle = globalThis.crypto.subtle;
    const root = await subtle.importKey("raw", enc.encode(secret), "HKDF", false, ["deriveBits"]);
    const derive = (info) => subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: new Uint8Array(0), info: enc.encode(info) }, root, 256);
    const [macRaw, cipherRaw] = await Promise.all([derive("mailtag/rid/mac"), derive("mailtag/rid/enc")]);
    const [mac, cipher] = await Promise.all([
        subtle.importKey("raw", macRaw, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]),
        subtle.importKey("raw", cipherRaw, "AES-CTR", false, ["encrypt", "decrypt"]),
    ]);
    return { mac, cipher };
}
async function ivOf(mac, plain) {
    const tag = await globalThis.crypto.subtle.sign("HMAC", mac, plain);
    return new Uint8Array(tag).slice(0, IV_BYTES);
}
function counterOf(iv) {
    const counter = new Uint8Array(16);
    counter.set(iv);
    return counter;
}
function sameBytes(a, b) {
    if (a.length !== b.length)
        return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++)
        diff |= a[i] ^ b[i];
    return diff === 0;
}
/**
 * 받는 사람 메일 주소 → `rid`. 주소는 앞뒤 공백을 떼고 소문자로 맞춘 뒤 암호화한다.
 * 주소 모양이 아니거나 키가 짧으면 던진다. `version` 은 키를 바꿀 때만 올린다(기본 1).
 */
export async function mailRecipientId({ email, secret, version = 1, }) {
    const address = (email ?? "").trim().toLowerCase();
    if (!address.includes("@") || address.length > MAX_EMAIL || /\s/.test(address)) {
        throw new Error("mailtag: rid 를 만들 메일 주소가 올바르지 않다");
    }
    if (!Number.isInteger(version) || version < 1 || version > 999) {
        throw new Error("mailtag: rid 키 버전은 1~999 의 정수여야 한다");
    }
    const { mac, cipher } = await keysOf(secret);
    const plain = enc.encode(address);
    const iv = await ivOf(mac, plain);
    const body = new Uint8Array(await globalThis.crypto.subtle.encrypt({ name: "AES-CTR", counter: counterOf(iv), length: 32 }, cipher, plain));
    const out = new Uint8Array(iv.length + body.length);
    out.set(iv);
    out.set(body, iv.length);
    return `k${version}_${b32encode(out)}`;
}
/**
 * `rid` → 받는 사람 메일 주소. `secrets` 는 «키 버전 → 비밀 키»(예 `{ 1: process.env.MAIL_RID_SECRET }`).
 * 모양이 다르거나, 그 버전의 키가 없거나, 손댄 값·다른 키로 만든 값이면 null — 던지지 않는다(주소창에서 온 값이라
 * 아무 글자나 들어올 수 있다).
 */
export async function mailRecipientEmail({ rid, secrets, }) {
    const m = RID_SHAPE.exec((rid ?? "").trim());
    if (!m)
        return null;
    const version = Number(m[1]);
    const secret = Object.prototype.hasOwnProperty.call(secrets, version) ? secrets[version] : null;
    if (!secret)
        return null;
    const bytes = b32decode(m[2]);
    if (!bytes || bytes.length <= IV_BYTES || bytes.length > IV_BYTES + MAX_EMAIL)
        return null;
    const iv = bytes.slice(0, IV_BYTES);
    const { mac, cipher } = await keysOf(secret);
    const plain = new Uint8Array(await globalThis.crypto.subtle.decrypt({ name: "AES-CTR", counter: counterOf(iv), length: 32 }, cipher, bytes.slice(IV_BYTES)));
    if (!sameBytes(await ivOf(mac, plain), iv))
        return null;
    return new TextDecoder().decode(plain);
}
