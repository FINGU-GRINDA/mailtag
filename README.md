# @fingu-grinda/mailtag

## 요약
린다(Rinda) 메일 링크에 붙이는 UTM 태그 규칙(mailtag)의 단일 정본 TypeScript 패키지다. 보내는 쪽은 `mailTagUrl` 로 메일 종류(rinda_campaign·personal·nudge·welcome·letter·release·lead)별 `utm_*` 를 붙이고, 받는 쪽은 `mailKindOf`·`isLeadMailUtm`·`isSalesFollowupMail` 등으로 방문이 어떤 메일에서 왔는지 판정한다(옛 값도 지금 종류로 묶는다). 런타임 의존성 없는 순수 ESM 이고 빌드된 `dist/` 를 커밋해 git 태그(최신 `v3.0.2`)로 설치한다. 운영 중이며 규칙 변경은 `test/golden.json` 부터 고친다.

린다 메일 링크 UTM(mailtag) 규칙을 담은 단일 정본 패키지입니다. v3 부터 **메일 UTM 의 정본은 이 패키지 하나**이고, 랜딩은 메일 규칙·이름을 따로 두지 않고 이 패키지를 가져다 보여 주기만 합니다(메일이 아닌 UTM — SNS·광고·박람회·블로그 — 은 랜딩 DB `utm_rules` 가 정본으로 남습니다). 메일 링크는 코드가 만들기 때문에, 메일 규칙을 바꾸려면 어차피 이 패키지가 바뀌어야 합니다. 메일을 보내는 쪽(링크에 UTM 붙이기)과 유입을 읽는 쪽(어느 메일에서 왔는지 판정)이 같은 코드를 씁니다.

예전에는 send-grid-test·rinda-landing·ara·deal-tracker-webapp 네 레포가 같은 규칙을 각자 복사해 두고 있었습니다. 그러다 보니 한쪽만 고쳐져 집계가 어긋나는 일이 생겼습니다. 이제 규칙은 이 저장소에만 두고, 네 레포는 git 태그로 받아 씁니다.

- 외부 런타임 의존성은 없습니다. 순수 ESM이고 Node·Bun·브라우저(Vite·Next)에서 똑같이 동작합니다. Node 전용 API는 쓰지 않습니다.
- `src/`의 TypeScript를 `tsc`로 빌드한 `dist/`(JS와 `.d.ts`)를 **커밋해 둡니다**. 그래서 쓰는 쪽에서 따로 컴파일할 필요가 없습니다.
- 정본 규칙 문서는 사내 KMS에 있습니다. 이 저장소의 `test/golden.json`은 그 규칙을 정답 목록으로 옮긴 것입니다.

## 규칙 요약 (v3, 2026-11)

source 는 폴더처럼 «어떤 메일인가», campaign 은 그 폴더 안에서 «무엇»입니다.

| 축 | 값 |
|---|---|
| `utm_source` | 메일 종류 이름 그대로입니다. `rinda_campaign`(린다 캠페인 메일, 바이어에게) · `personal`(담당자 1:1 메일, 바이어에게) · `nudge`(유저에게 자동으로 가는 메일 전부 — 거래성·마케팅성 모두) · `welcome` · `letter`(린다레터) · `release`(업데이트 노트) · `lead`(비회원 리드 메일) |
| `utm_medium` | 항상 `email` |
| `utm_campaign` | rinda_campaign 은 캠페인마다 지은 UTM 이름(예 `kr_food_buyer_0421`), personal 은 보낸 이유(`PERSONAL_REASONS` 의 값만 — `from_campaign`·`inbound`·`voucher`·`referral`·`fair`·`cold`. 목록 밖 값은 오류를 던집니다), nudge 는 넛지 유형 키, 회차 메일은 `YYYYMMDD`, 리드 메일은 `freetool_<도구키>`·`leadmagnet` 입니다. 바이어에게 가는 메일은 campaign 이 없으면 오류를 던집니다 |
| `utm_content` | 제품·리드 메일의 식별자(글 슬러그, A/B 변형, 자료키) |
| `utm_term` | 제품·리드 메일은 링크 자리 `main_<이름>`·`sub_<이름>`·`bnr`/`bnr_a`/`bnr_b`·`txt_<이름>`·`img_<이름>`. 바이어에게 가는 메일은 접두어 없이 이름만(`signup`·`pricing`)이고, 접두어가 붙으면 오류를 던집니다 |
| `utm_id` | rinda_campaign 은 캠페인 id(선택, 하이픈을 뺀 값). 제품·리드 메일은 희생 슬롯(선택). personal 에는 붙이지 않습니다 |
| `rid` (UTM 밖) | personal 의 받는 사람 id(선택, `recipient`). 받는 사람 메일 주소를 비밀 키로 암호화한 값이고 `mailRecipientId` 로 만듭니다. 고객사 이름·주소를 링크에 그대로 싣지 않으려는 것입니다. 다른 메일에는 붙이지 않습니다 |

- 순서는 `rid` → source → medium → campaign → content → term → id 이고, 값이 빈 축은 생략합니다. `rid` 를 UTM 앞에 두는 까닭은 메일 클릭 추적기가 주소 맨 끝 값 뒤에 제 경로를 이어 붙이기 때문입니다.
- 입력 주소에 이미 있던 `utm_*`·`rid` 는 지웁니다. 다른 쿼리와 fragment는 그대로 둡니다.
- campaign·content·term·id·rid 에는 `^[a-z0-9_]+$`에 맞는 값만 씁니다. 한글·대문자·공백·하이픈이 들어오면 고쳐 붙이지 않고 **오류를 던집니다**.
- 옛 값(`email`·`system`·`lifecycle`)으로는 새 링크를 만들지 않습니다(`kind` 에 없습니다). 이미 나간 링크는 받는 쪽 판정이 지금 종류로 묶어 읽습니다.
- 파트너스 고객사 대행 콜드메일은 적용 대상이 아닙니다. 고객사 이름으로 나가는 메일이기 때문입니다.

### 받는 쪽 판정

| 함수 | 판정 |
|---|---|
| `mailKindOf({ source, medium, campaign, content, slugs })` | 지금 기준 메일 종류. 새 값은 그대로, 옛 값은 `system`·`lifecycle` → `nudge`, `email` 중 옛 제품 메일 campaign(`LEGACY_EMAIL_PRODUCT_CAMPAIGNS` — newsletter → letter 등) → 그 종류, 담당자 1:1 메일 → `personal`, 나머지 `email` → `rinda_campaign`, 옛 리드 값 → `lead`. 메일이 아니면 null |
| `personalReasonOf({ source, campaign })` | 담당자 1:1 메일의 보낸 이유. 새 값은 campaign, 옛 `followup` → `from_campaign`, `followup_<x>` → `x` |
| `followupInflow(campaign)` | 옛 값 읽기용. `followup` → `coldmail`, `followup_<x>` → `x`, 팔로업이 아니면 null |
| `isLeadMailUtm({ source, medium, campaign })` | 비회원 리드 메일 여부를 봅니다. 아래 조건 중 하나라도 맞으면 참입니다. 제품 메일·콜드메일 판정보다 **먼저** 불러야 합니다 |
| `isSalesFollowupMail({ source, campaign, content, slugs })` | 담당자 1:1 메일이면 참입니다. source=personal, 또는 옛 값 source=email 이면서 campaign=followup·followup_<유입경로>, 또는 campaign=coldmail 이면서 content가 옛 팔로업 슬러그 |
| `isLegacyFollowupArrival({ source, campaign, content, slugs })` | 옛 1:1 팔로업 링크로 도착한 행인지 봅니다(source=email · campaign=coldmail · content가 옛 슬러그) |
| `isLegacyFollowupContent({ content, slugs })` | content가 `slugs`의 값과 같거나 `<슬러그>_…`로 시작하는지 봅니다 |

옛 1:1 팔로업 슬러그 목록은 고객사 이름이라 이 공개 패키지에 넣지 않습니다. 각 레포(비공개)가 자기 목록을 갖고 `slugs`로 넘깁니다.

`isLeadMailUtm`가 참이 되는 조건입니다. 값은 앞뒤 공백을 걷고 소문자로 바꿔 비교합니다.

- `source=lead` (지금 쓰는 다른 메일 종류 source 는 리드가 아닙니다)
- campaign이 `leadmagnet`·`lead_magnet`이거나 `freetool_*`·`free_tool_*`로 시작
- `source=free-tool-email`
- source가 `*-email`이고 `medium=nudge`
- `campaign=nudge`이고 source가 비어 있지 않으면서 `email`이 아님. 예전 자료 넛지가 source=downloads·beauty-guide·prompts-500·japan-buyer-prompts, medium=email로 나갔기 때문입니다. source=email이면서 campaign=nudge인 경우는 옛 제품 메일이라 리드가 아닙니다.

## 설치

```json
{
  "dependencies": {
    "@fingu-grinda/mailtag": "github:FINGU-GRINDA/mailtag#v3.0.0"
  }
}
```

```bash
bun add github:FINGU-GRINDA/mailtag#v3.0.0
npm i github:FINGU-GRINDA/mailtag#v3.0.0
pnpm add github:FINGU-GRINDA/mailtag#v3.0.0
```

공개 저장소라서 설치할 때 토큰이 필요 없습니다. 빌드 결과(`dist`)가 저장소에 들어 있어 설치 중에 빌드 스크립트도 돌지 않습니다.

```ts
import { mailRecipientEmail, mailRecipientId, mailTagUrl, personalReason } from "@fingu-grinda/mailtag"

// 린다 캠페인 메일
mailTagUrl({ kind: "rinda_campaign", url: "https://rinda.ai/pricing", campaign: "kr_food_buyer_0421", term: "pricing" })
// → https://rinda.ai/pricing?utm_source=rinda_campaign&utm_medium=email&utm_campaign=kr_food_buyer_0421&utm_term=pricing

// 담당자 1:1 메일
mailTagUrl({
  kind: "personal",
  url: "https://rinda.ai/",
  campaign: personalReason({ inflow: "voucher" }), // 캠페인에 답한 곳이면 from_campaign
  term: "signature",
  // 받는 사람 id — 주소를 암호화한 값. 키는 환경변수에서 읽어 넘긴다(이 패키지에는 키가 없다)
  recipient: await mailRecipientId({ email: "kim@acme.com", secret: process.env.MAIL_RID_SECRET }),
})
// → https://rinda.ai/?rid=k1_4y2b…&utm_source=personal&utm_medium=email&utm_campaign=voucher&utm_term=signature

// 읽는 쪽 — 키가 있으면 주소로 되돌린다. 손댄 값·다른 키로 만든 값은 null
await mailRecipientEmail({ rid: "k1_4y2b…", secrets: { 1: process.env.MAIL_RID_SECRET } }) // → "kim@acme.com"
```

### 받는 사람 id (`rid`)

- 모양은 `k<키 버전>_<base32 소문자>` 입니다. 같은 주소·같은 키면 어디서 만들든 같은 값이 나와서, 표 없이도 `rid` 만으로 같은 사람을 셉니다.
- 비밀 키는 32자 이상이어야 하고 **이 저장소에 두지 않습니다**. 만드는 서버와 읽는 서버의 환경변수에만 둡니다.
- 키를 바꿀 때는 `version` 을 올리고, 읽는 쪽 `secrets` 에 옛 버전 키를 남겨 둡니다. 그래야 이미 나간 링크가 계속 풀립니다.
- 키가 새면 이미 나간 링크의 주소가 모두 풀립니다. 분석 도구(GA4 등)에는 `rid` 를 가려서 보내세요.
- 방식: HKDF-SHA256 으로 키 둘을 만들고, HMAC-SHA256(주소) 앞 12바이트를 iv 로 써서 AES-256-CTR 로 암호화합니다(SIV 구성). 풀 때 HMAC 을 다시 계산해 iv 와 같아야만 주소를 돌려줍니다. WebCrypto 만 쓰므로 Node·Bun·브라우저에서 같은 값이 나옵니다.

## export 목록

| 분류 | 이름 |
|---|---|
| 종류·상수 | `MAIL_KIND_SOURCE` · `MAIL_KIND_LABEL`(화면 이름) · `MailKind` · `ProductMailKind` · `SALES_MAIL_SOURCES` · `PRODUCT_MAIL_SOURCES` · `LEAD_MAIL_SOURCES` · `RECIPIENT_PARAM` · `MAIL_TAG_SAFE` · `UTM_ORDER` · `UtmKey` · `isMailKind` |
| 링크 만들기 | `mailTagUrl(input: MailTagInput)` · `personalReason({ inflow? })` · `PERSONAL_REASONS`(보낸 이유 목록 = 값 → 화면 이름) · `PersonalReason` · `isPersonalReason` |
| 받는 사람 id | `mailRecipientId({ email, secret, version? })` · `mailRecipientEmail({ rid, secrets })` · `RECIPIENT_ID_MIN_SECRET` |
| 자리(term) | `isPositionTerm` · `salesTermName`(옛 `txt_signature` → `signature`) · `mailTerm.{main,sub,bnr,txt,img}` · `mailTermName` · `mailTermNameFromUrl` · `MAIL_TERM_RULE` · `EmailLinkRole` · `isLegacyPositionContent` |
| 게이트 | `mailTagErrors(url: URL)` · `checkEmailUtm(html)` · `decodeEntities` |
| 슬러그·날짜 | `toUtmSlug` · `kstDateStamp(Date \| ms \| { atMs })` · `followupCompanySlug({ email, brand? })`(웹메일이면 brand, 없으면 null) · `companyUtmSlug({ id, name, email?, website? })` · `WEBMAIL_LABELS` |
| 받는 쪽 판정 | `mailKindOf` · `personalReasonOf` · `isLeadMailUtm` · `LEGACY_LEAD_MAIL_SOURCES` · `LEGACY_NUDGE_SOURCES` · `LEGACY_EMAIL_PRODUCT_CAMPAIGNS` · `LegacyFollowupSlugs`(타입) · `isLegacyFollowupContent` · `isSalesFollowupMail` · `isLegacyFollowupArrival` · `followupInflow` |

`MailTagInput`의 선택 필드는 `null`도 받고, `undefined`와 똑같이 취급합니다. `kind`는 `MailKind`(문자열 리터럴 유니온)입니다.

## v2 → v3 올릴 때 바꿀 것

| v2 | v3 |
|---|---|
| `kind: "coldmail"` + `campaignName`·`sendDate` | `kind: "rinda_campaign"` + `campaign: <캠페인 UTM 이름>`(+ 선택 `id: <하이픈 뺀 캠페인 id>`). content 의 `<캠페인명>_<날짜>` 는 없어졌습니다 |
| `kind: "followup"` + `company`·`sendDate`·`inflow` | `kind: "personal"` + `campaign: personalReason({ inflow })` + 선택 `recipient: <받는 사람 id>`. content 의 `<고객사>_<날짜>` 는 없어졌습니다 |
| `kind: "system"` · `kind: "lifecycle"` | `kind: "nudge"` (거래성·마케팅성 구분 없이) |
| `coldmailTagUrl` · `followupTagUrl` · `followupCampaign` | 없어졌습니다. `mailTagUrl` · `personalReason` 을 쓰세요 |
| `PRODUCT_MAIL_SOURCES` 에 `system`·`lifecycle` | `nudge` 로 바뀌었습니다. 옛 값은 `LEGACY_NUDGE_SOURCES` 이고, 받는 쪽은 `mailKindOf` 로 한 번에 묶습니다 |
| 제품 메일 `utm_id` 필수(게이트) | 선택입니다 |
| 게이트(`checkEmailUtm`)가 `utm_source=email`·`system`·`lifecycle` 을 통과 | 거절합니다. 옛 값이 구워진 본문은 다시 태그하세요 |

## 네 레포 전환 때 바꿀 이름 (v1 → v2 기록)

| 레포 · 옛 위치 | 옛 이름 | 패키지 이름 | 비고 |
|---|---|---|---|
| ara `src/core/content/mailtag.ts` | `MAIL_TAG_SOURCE` | `MAIL_KIND_SOURCE` | 값은 같습니다 |
| ara | `MailTagKind` | `MailKind` | |
| ara | `MailTagInput.kind: string` | `kind: MailKind` | 호출부가 리터럴(`'followup'`)이라 그대로 통과합니다 |
| ara | `followupCompanySlug({ email, brand? })`(웹메일이면 brand, 없으면 null) · `WEBMAIL_LABELS` · `kstDateStamp({ atMs })` | 같은 이름 | 시그니처도 같습니다 |
| rinda-landing `src/lib/mailtag.ts` | `isLeadMailArrival({ source, medium })` | `isLeadMailUtm({ source, medium, campaign })` | 아래 «레포에 남기는 것»을 보세요. 랜딩은 정규화와 `medium=nudge` 단독 판정을 감싸는 함수를 남깁니다 |
| rinda-landing | `MailTagInput.kind: string` | `kind: MailKind` | |
| rinda-landing | `toUtmSlug` · `kstDateStamp(date?)` · `LEGACY_LEAD_MAIL_SOURCES` · `MAIL_KIND_SOURCE` · `MailKind` · `mailTagUrl` | 같은 이름 | |
| rinda-landing | `LEGACY_FOLLOWUP_SLUGS`(상수) | 패키지에 없음 | 랜딩에 그대로 남깁니다(고객 정보) |
| rinda-landing | `isLegacyFollowupContent(content)` | `isLegacyFollowupContent({ content, slugs: LEGACY_FOLLOWUP_SLUGS })` | 위치 인자에서 객체 인자로 바뀌고, 슬러그 목록을 넘깁니다 |
| rinda-landing | `isSalesFollowupMail({ source, campaign, content })` · `isLegacyFollowupArrival({ source, campaign, content })` | 같은 이름에 `slugs` 추가 | `slugs: LEGACY_FOLLOWUP_SLUGS`를 넘기세요. 빠뜨리면 타입 오류가 납니다 |
| deal-tracker-webapp `src/lib/mailtag.ts` | `PUBLIC_MAIL_DOMAINS`(비공개) | `WEBMAIL_LABELS` | 목록이 늘었습니다: googlemail·msn·mac·aol·proton·protonmail·gmx·yandex·qq·163·126 |
| deal-tracker-webapp | `SECOND_LEVEL`(비공개) | 패키지 내부 | gov·edu·ltd·plc가 추가됐습니다 |
| deal-tracker-webapp | `companyUtmSlug` · `toUtmSlug` · `kstDateStamp(date?)` · `mailTagUrl` · `MAIL_KIND_SOURCE` · `MailKind` | 같은 이름 | `MailTagInput.kind`는 `MailKind`입니다 |
| send-grid-test `utils/email-layout/utm.ts` | 모든 export | 같은 이름 | import 경로만 `@fingu-grinda/mailtag`로 바꾸면 됩니다 |
| send-grid-test | `TERM_RULE`(비공개) | `MAIL_TERM_RULE` | |
| send-grid-test `constants/legacy-followup-slugs.ts` | `LEGACY_FOLLOWUP_SLUGS` | 패키지에 없음 | 상수는 레포에 남깁니다(고객 정보). `LEGACY_FOLLOWUP_SLUGS.includes(content)`는 `isLegacyFollowupContent({ content, slugs: LEGACY_FOLLOWUP_SLUGS })`로 바꾸세요. `<슬러그>_…` 앞부분 일치도 팔로업으로 봅니다(랜딩 판정과 같아집니다) |
| send-grid-test `services/new-customer-tracking.service.ts` | `isLeadMail(row)`(비공개) | `isLeadMailUtm({ source: row.utm_source, medium: row.utm_medium, campaign: row.utm_campaign })` | `campaign=nudge`이고 source가 email이 아닌 경우를 리드로 보는 규칙이 추가됐습니다. 그 결과 `campaign === "nudge" → product_email`은 source=email(또는 빈 값)일 때만 남습니다 |
| 각 레포 `mailtag.golden.json` · `utm.golden.json` | 복사본 | `test/golden.json` | 레포의 golden 테스트는 지우거나 패키지를 대상으로 바꾸세요 |

오류 메시지는 정본(send-grid) 쪽 한국어 문구로 통일했습니다. 복사본이 던지던 영문 메시지(`unknown kind …`, `sendDate must be YYYYMMDD`)를 문자열로 비교하는 테스트가 있다면 `toThrow()`처럼 오류 발생 여부만 보도록 바꾸세요.

## 패키지에 넣지 않고 각 레포에 남기는 것

기준은 하나입니다. **규칙 자체는 이 패키지에 둡니다. 특정 레포의 저장 방식·화면·발송 파이프라인에 묶인 것은 그 레포에 남깁니다.**

| 이름 | 레포 | 남기는 이유 |
|---|---|---|
| `collectableMailUtm` · `cutMailValueTail` | rinda-landing | page_view에 어떤 content·term을 저장할지 정하는 랜딩 전용 게이트입니다. 랜딩의 `normalizeUtmKey`(추적기 꼬리 자르기)와 수집 이력(#1367·#1391)에 묶여 있고, 다른 레포에는 이 저장 경로가 없습니다. 판정에 필요한 규칙 조각(`MAIL_KIND_SOURCE`·`MAIL_TAG_SAFE`·`MAIL_TERM_RULE`·`isLegacyFollowupContent`)은 패키지에서 가져다 쓰면 됩니다 |
| `isLeadMailArrival` | rinda-landing | 랜딩은 값을 `normalizeUtmKey`로 정규화하고, source와 상관없이 `medium=nudge`만 있어도 리드로 봅니다(무료도구 결과 화면의 «메일에서 왔다» 표시용). 패키지의 `isLeadMailUtm`을 감싸는 얇은 함수로 남깁니다 |
| `EMAIL_FOLLOWUP_LABEL_KEY` · `mailLabelKey` · `LEAD_MAIL_LABEL` · `LEAD_MAIL_LABELS` | rinda-landing | 어드민 유입경로 라벨 맵과 SQL(0059) 키입니다. 화면 문구라 규칙이 아닙니다. `LEAD_MAIL_LABELS`는 패키지의 `MAIL_KIND_SOURCE.lead`와 `LEGACY_LEAD_MAIL_SOURCES`로 만듭니다 |
| `withMailCampaign` · `tagMailLinks` (`mail-links.ts`) · `link-wiring.ts` | send-grid-test | 제품 메일 HTML 재작성기입니다. 넛지 편집기 표식(`data-mds-track` 등), 우리 도메인 판정, htmlparser2 의존이 send-grid에 묶여 있습니다 |
| `LEGACY_PRODUCT_CAMPAIGNS` · `mailChannel` · `classifyChannel` | send-grid-test | 가입 채널 집계입니다. 레포 고유 채널 이름(`product_email`·`lead_email`…)과 DB 집계에 묶여 있습니다. 판정 조각(`isLeadMailUtm`·`isLegacyFollowupContent`·`PRODUCT_MAIL_SOURCES`)만 패키지에서 가져옵니다 |
| `tagFollowupLinks` | deal-tracker-webapp | 1:1 메일 HTML 안의 rinda.ai 링크만 고르는 정규식으로, 딜트래커 발송 경로에서만 씁니다. 안에서 `mailTagUrl`을 부르기 때문에 규칙은 패키지를 따릅니다 |

## 개발

```bash
npm ci
npm run build   # src → dist
npm test        # node --test: golden.json 전부 + 받는 쪽 판정 + 슬러그
```

`dist/`는 커밋 대상입니다. `src/`를 고쳤다면 반드시 `npm run build`를 돌리고 `dist/`도 함께 커밋하세요. CI 워크플로(빌드 → `dist/` 일치 확인 → 테스트, 액션은 SHA로 고정)는 `ci/ci.yml`에 있습니다. 이 저장소를 올린 토큰에 `workflow` 권한이 없어서 `.github/workflows/`에 넣지 못했습니다. `workflow` 권한이 있는 계정이 `.github/workflows/ci.yml`로 옮겨 서명 커밋하면 켜집니다. 그 전까지는 커밋하기 전에 `npm run build && git status -- dist && npm test`를 직접 돌리세요.

## 버전 올리는 법

1. 규칙을 바꾸는 경우에는 `test/golden.json`부터 고칩니다. 그다음 `src/`를 고칩니다.
2. `npm run build && npm test`를 돌린 뒤 `src/`·`dist/`·`test/`를 커밋합니다. 기본 브랜치에는 서명된 커밋만 들어갑니다.
3. `package.json`의 `version`을 올립니다.
   - patch: 동작이 같은 수정
   - minor: export 추가, 판정에 새 옛 값 추가
   - major: 이름 변경, 같은 입력에 대한 결과 변경
4. 태그 `vX.Y.Z`를 새로 답니다. **이미 단 태그는 옮기지 않습니다.** 쓰는 쪽이 고정한 버전의 내용이 바뀌면 안 되기 때문입니다.
5. 쓰는 레포에서는 `"@fingu-grinda/mailtag": "github:FINGU-GRINDA/mailtag#vX.Y.Z"`로 올리고 lockfile을 갱신합니다.

---

Grinda AI 내부용.
