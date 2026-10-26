# @fingu-grinda/mailtag

## 요약
린다(Rinda) 메일 링크에 붙이는 UTM 태그 규칙(mailtag)의 단일 정본 TypeScript 패키지다. 보내는 쪽은 `mailTagUrl` 등으로 메일 종류(coldmail·followup·letter·release·lifecycle·system·lead)별 `utm_*` 를 붙이고, 받는 쪽은 `isLeadMailUtm`·`isSalesFollowupMail` 등으로 방문이 어떤 메일에서 왔는지 판정한다. 런타임 의존성 없는 순수 ESM 이고 빌드된 `dist/` 를 커밋해 git 태그(최신 `v2.0.0`)로 설치한다. 운영 중이며 규칙 변경은 `test/golden.json` 부터 고친다.

린다 메일 링크 UTM(mailtag) 규칙을 담은 단일 정본 패키지입니다. 메일을 보내는 쪽(링크에 UTM 붙이기)과 유입을 읽는 쪽(어느 메일에서 왔는지 판정)이 같은 코드를 씁니다.

예전에는 send-grid-test·rinda-landing·ara·deal-tracker-webapp 네 레포가 같은 규칙을 각자 복사해 두고 있었습니다. 그러다 보니 한쪽만 고쳐져 집계가 어긋나는 일이 생겼습니다. 이제 규칙은 이 저장소에만 두고, 네 레포는 git 태그로 받아 씁니다.

- 외부 런타임 의존성은 없습니다. 순수 ESM이고 Node·Bun·브라우저(Vite·Next)에서 똑같이 동작합니다. Node 전용 API는 쓰지 않습니다.
- `src/`의 TypeScript를 `tsc`로 빌드한 `dist/`(JS와 `.d.ts`)를 **커밋해 둡니다**. 그래서 쓰는 쪽에서 따로 컴파일할 필요가 없습니다.
- 정본 규칙 문서는 사내 KMS에 있습니다. 이 저장소의 `test/golden.json`은 그 규칙을 정답 목록으로 옮긴 것입니다.

## 규칙 요약 (2026-10-15 결정)

| 축 | 값 |
|---|---|
| `utm_source` | 메일 종류(kind)마다 정해진 값입니다. coldmail·followup → `email`, letter → `letter`, release → `release`, welcome → `welcome`, lifecycle → `lifecycle`, system → `system`, lead → `lead` |
| `utm_medium` | 항상 `email` |
| `utm_campaign` | coldmail은 `coldmail`입니다. followup은 콜드메일로 들어온 고객사면 `followup`, 그 밖의 경로(지원사업·박람회·소개·인바운드 등)로 들어온 고객사면 `followup_<유입경로>`(예 `followup_voucher`)입니다(2026-10-20). 회차 메일은 `YYYYMMDD`, 넛지는 type_key, 리드 메일은 `freetool_<도구키>`(무료도구) 또는 `leadmagnet`(자료 다운로드)입니다 |
| `utm_content` | coldmail은 `<캠페인명>_<발송시작일 YYYYMMDD>`, followup은 `<고객사슬러그>_<발송일 YYYYMMDD>`입니다. 고객사슬러그는 회사 메일 도메인 이름이고, 상대가 웹메일(naver·gmail 등)을 쓰면 브랜드 영문명입니다(2026-10-20, `webmail` 로 묶지 않습니다). 제품·리드 메일에는 식별자(글 슬러그, A/B 변형, 자료키)를 넣습니다 |
| `utm_term` | 제품·리드 메일은 링크 자리를 나타냅니다. `main_<이름>`·`sub_<이름>`·`bnr`/`bnr_a`/`bnr_b`·`txt_<이름>`·`img_<이름>`. 세일즈 메일(coldmail·followup)은 링크만 쓰므로 접두어 없이 이름만 씁니다(`signup`·`signature`, 2026-10-20). 접두어가 붙으면 오류를 던집니다 |
| `utm_id` | 제품·리드 메일에만 맨 끝 희생 슬롯으로 붙입니다(`nl`·`u1`·`w3`·`n1`·`f1`·`l1`…). 세일즈 메일(coldmail·followup)에는 붙이지 않습니다 |

- 순서는 source → medium → campaign → content → term → id이고, 값이 빈 축은 생략합니다.
- 입력 주소에 이미 있던 `utm_*`는 지웁니다. 다른 쿼리와 fragment는 그대로 둡니다.
- campaign·content·term·id에는 `^[a-z0-9_]+$`에 맞는 값만 씁니다. 한글·대문자·공백이 들어오면 고쳐 붙이지 않고 **오류를 던집니다**.
- 파트너스 고객사 대행 콜드메일은 적용 대상이 아닙니다. 고객사 이름으로 나가는 메일이기 때문입니다.

### 받는 쪽 판정

| 함수 | 판정 |
|---|---|
| `followupInflow(campaign)` | `followup` → `coldmail`, `followup_<x>` → `x`, 팔로업이 아니면 null |
| `isLeadMailUtm({ source, medium, campaign })` | 비회원 리드 메일 여부를 봅니다. 아래 조건 중 하나라도 맞으면 참입니다. 제품 메일·콜드메일 판정보다 **먼저** 불러야 합니다 |
| `isSalesFollowupMail({ source, campaign, content, slugs })` | source=email이면서 campaign=followup·followup_<유입경로>면 참입니다. campaign=coldmail이라도 content가 옛 팔로업 슬러그면 참입니다 |
| `isLegacyFollowupArrival({ source, campaign, content, slugs })` | 옛 1:1 팔로업 링크로 도착한 행인지 봅니다(source=email · campaign=coldmail · content가 옛 슬러그) |
| `isLegacyFollowupContent({ content, slugs })` | content가 `slugs`의 값과 같거나 `<슬러그>_…`로 시작하는지 봅니다 |

옛 1:1 팔로업 슬러그 목록은 고객사 이름이라 이 공개 패키지에 넣지 않습니다. 각 레포(비공개)가 자기 목록을 갖고 `slugs`로 넘깁니다.

`isLeadMailUtm`가 참이 되는 조건입니다. 값은 앞뒤 공백을 걷고 소문자로 바꿔 비교합니다.

- `source=lead`
- campaign이 `leadmagnet`·`lead_magnet`이거나 `freetool_*`·`free_tool_*`로 시작
- `source=free-tool-email`
- source가 `*-email`이고 `medium=nudge`
- `campaign=nudge`이고 source가 비어 있지 않으면서 `email`이 아님. 예전 자료 넛지가 source=downloads·beauty-guide·prompts-500·japan-buyer-prompts, medium=email로 나갔기 때문입니다. source=email이면서 campaign=nudge인 경우는 옛 제품 메일이라 리드가 아닙니다.

## 설치

```json
{
  "dependencies": {
    "@fingu-grinda/mailtag": "github:FINGU-GRINDA/mailtag#v2.0.0"
  }
}
```

```bash
bun add github:FINGU-GRINDA/mailtag#v2.0.0
npm i github:FINGU-GRINDA/mailtag#v2.0.0
pnpm add github:FINGU-GRINDA/mailtag#v2.0.0
```

공개 저장소라서 설치할 때 토큰이 필요 없습니다. 빌드 결과(`dist`)가 저장소에 들어 있어 설치 중에 빌드 스크립트도 돌지 않습니다.

```ts
import { mailTagUrl, followupCompanySlug, kstDateStamp } from "@fingu-grinda/mailtag"

mailTagUrl({
  kind: "followup",
  url: "https://rinda.ai/",
  company: followupCompanySlug({ email: "kim@example.co.kr", brand: "Example" }),
  sendDate: kstDateStamp(),
  term: "signature",
  inflow: "coldmail", // 콜드메일 외 유입이면 voucher·fair·referral·inbound 등
})
```

## export 목록

| 분류 | 이름 |
|---|---|
| 종류·상수 | `MAIL_KIND_SOURCE` · `MailKind` · `ProductMailKind` · `PRODUCT_MAIL_SOURCES` · `LEAD_MAIL_SOURCES` · `MAIL_TAG_SAFE` · `UTM_ORDER` · `UtmKey` · `isMailKind` |
| 링크 만들기 | `mailTagUrl(input: MailTagInput)` · `coldmailTagUrl({ url, campaignName, sendDate, term? })` · `followupTagUrl({ url, company, sendDate, term?, inflow? })` · `followupCampaign({ inflow? })` |
| 자리(term) | `isPositionTerm` · `salesTermName`(옛 `txt_signature` → `signature`) · `mailTerm.{main,sub,bnr,txt,img}` · `mailTermName` · `mailTermNameFromUrl` · `MAIL_TERM_RULE` · `EmailLinkRole` · `isLegacyPositionContent` |
| 게이트 | `mailTagErrors(url: URL)` · `checkEmailUtm(html)` · `decodeEntities` |
| 슬러그·날짜 | `toUtmSlug` · `kstDateStamp(Date \| ms \| { atMs })` · `followupCompanySlug({ email, brand? })`(웹메일이면 brand, 없으면 null) · `companyUtmSlug({ id, name, email?, website? })` · `WEBMAIL_LABELS` |
| 받는 쪽 판정 | `isLeadMailUtm` · `LEGACY_LEAD_MAIL_SOURCES` · `LegacyFollowupSlugs`(타입) · `isLegacyFollowupContent` · `isSalesFollowupMail` · `isLegacyFollowupArrival` |

`MailTagInput`의 선택 필드는 `null`도 받고, `undefined`와 똑같이 취급합니다. `kind`는 `MailKind`(문자열 리터럴 유니온)입니다.

## 네 레포 전환 때 바꿀 이름

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
