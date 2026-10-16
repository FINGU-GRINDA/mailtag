// 정답 목록(golden.json)을 빌드 결과(dist)가 그대로 통과하는지. 여기서 깨지면 목록이 아니라 구현을 고친다.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { checkEmailUtm, mailTagUrl } from "../dist/index.js"

const golden = JSON.parse(readFileSync(new URL("./golden.json", import.meta.url), "utf8"))

test("정답 목록 크기", () => {
  assert.equal(golden.cases.length, 12)
  assert.equal(golden.errors.length, 7)
})

for (const c of golden.cases) {
  test(`통과 — ${c.name}`, () => {
    const out = mailTagUrl(c.in)
    assert.equal(out, c.out)
    // 만든 주소는 게이트도 통과해야 한다(자리 표시 없는 링크 = 값 규칙만).
    assert.deepEqual(checkEmailUtm(`<a href="${out}">x</a>`), [])
  })
}

for (const c of golden.errors) {
  test(`거절 — ${c.name}`, () => {
    assert.throws(() => mailTagUrl(c.in))
  })
}
