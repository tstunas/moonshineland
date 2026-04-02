const GENERAL_RULE_HIGHLIGHTS = [
  "가상인물 창작 원칙, 친목행위 금지, 현실 사건 특정 금지 등 기본 금기를 모든 이용자가 지켜야 합니다.",
  "성인 표시가 없는 일반 스레드에서는 성적인 내용, 성적 교류 유도, 고수위 표현을 할 수 없습니다.",
  "신고·심의·처벌은 운영자 기준으로 진행되며, 위반 시 경고부터 정지/영구정지까지 적용됩니다.",
];

const GENERAL_RULES_FULL_TEXT = `문샤인랜드 일반 규칙

적용 대상

모든 이용자와 모든 게시판(일반/성인 포함)에 공통 적용된다.

제 1장 기본 원칙

1. 본 사이트는 비영리 목적의 창작 커뮤니티이며, 대한민국 법률 준수를 원칙으로 한다.
2. 디지털 성범죄는 예방되어야 하며, 관련 사안 발생 시 사이트는 정부기관에 협조한다.
3. 모든 창작물은 가상인물을 소재로 해야 한다.

제 2장 금기

1. 가족놀이, 뒷방 등으로 대표되는 친목행위를 금지한다.
2. 현실 범죄를 모티브로 창작하더라도 실명, 특정 지명 등 사건을 특정할 수 있는 요소를 금지한다.
3. 타 사이트 비방, 분쟁 조장, 사이트 목적과 무관한 광고성 게시를 금지한다.
4. 무단 외부 유출, 무단 영리화 시도, 초대 도메인 무단 유출을 금지한다.

제 3장 게시판/스레드 운영

1. 주제글은 해당 게시판의 범위 내에서만 작성한다.
2. 운영자가 제시한 주제/범위/공지 기준을 준수한다.
3. 성인 표시가 없는 일반 스레드에서는 성적인 발언, 성적 교류 유도, 고수위 묘사 및 이에 준하는 내용을 금지한다.

제 4장 신고와 심의

1. 위반 게시물을 발견한 이용자는 신고할 의무가 있다.
2. 신고는 운영자 대상 1:1 채널(디스코드)로 접수한다.
3. 운영자는 접수 내역을 심의해 공고하며, 정해진 기간 내 항소 절차를 보장한다.

제 5장 처벌

1. 처벌은 경고, 삭제, 일시 정지, 영구 정지로 구분한다.
2. 경고 누적 및 반복 위반 시 처벌 수위가 단계적으로 강화된다.
3. 디지털 성범죄 시도/실행, 금지 이미지 업로드 등 중대한 위반은 경고 없이 즉시 중징계한다.`;

const ADULT_RULE_HIGHLIGHTS = [
  "성인 규칙은 성인인증 이용자에게만 적용되며, 성인 게시판/성인 표시 스레드에서만 유효합니다.",
  "수위가 높은 교류 의사는 프로필/나메 표기로 상호 확인해야 하며, 비동의자 대상 강요는 중징계 대상입니다.",
  "성인 교류는 허용된 구역에서만 가능하며, 금지 이미지·범죄성 콘텐츠는 즉시 영구정지 대상입니다.",
];

const ADULT_RULES_FULL_TEXT = `문샤인랜드 성인 규칙

적용 대상

성인인증이 완료된 이용자가 성인 게시판 또는 성인 표시가 명확한 스레드를 이용할 때 적용된다.

제 1장 이용 범위

1. 성인 규칙은 성인 이용 구역에서만 적용된다.
2. 일반 게시판 또는 성인 표시가 없는 스레드에서는 성인 규칙을 근거로 성적 표현을 허용하지 않는다.

제 2장 성인 교류 원칙

1. 수위가 높은 교류를 원하는 이용자는 식별 가능한 표기로 의사를 사전에 밝혀야 한다.
2. 상대가 수위 높은 교류를 원하지 않거나 지양 의사를 밝힌 경우, 지속적 어필과 강요를 금지한다.
3. 성인 교류는 운영 기준상 허용된 게시판/스레드에서만 가능하다.

제 3장 금지 콘텐츠

1. 아동·청소년 관련 기준을 위반하는 콘텐츠를 금지한다.
2. 유명인/실존 인물 명예훼손성 합성, 혐오 조장 이미지 등 심의 기준 위반 이미지를 금지한다.
3. 디지털 성범죄의 시도 또는 실행이 명백한 경우를 금지한다.

제 4장 성인 구역 처벌

1. 성인 규칙 위반은 일반 규칙의 처벌 체계(경고/정지/영구정지)를 동일하게 적용한다.
2. 비동의자 대상 성적 강요, 금지 이미지 업로드, 디지털 성범죄 관련 위반은 경고 없이 즉시 중징계한다.
3. 정부기관 수사 요청이 있을 경우 사이트는 관련 법령에 따라 협조한다.`;

type BoardSiteRulesProps = {
  isAdultVerified: boolean;
};

function RuleSection({
  title,
  subtitle,
  highlights,
  fullText,
  className,
  detailsClassName,
}: {
  title: string;
  subtitle: string;
  highlights: string[];
  fullText: string;
  className: string;
  detailsClassName: string;
}) {
  return (
    <section className={className}>
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-700">{subtitle}</p>

      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-6 text-slate-700">
        {highlights.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <details className={detailsClassName}>
        <summary className="cursor-pointer select-none text-sm font-semibold text-slate-900">
          전체 규칙 펼치기/접기
        </summary>
        <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
          {fullText}
        </div>
      </details>
    </section>
  );
}

export function BoardSiteRules({ isAdultVerified }: BoardSiteRulesProps) {
  return (
    <div className="mt-2 space-y-4">
      <RuleSection
        title="문샤인랜드 일반 규칙"
        subtitle="모든 이용자가 반드시 지켜야 하는 기본 규칙입니다."
        highlights={GENERAL_RULE_HIGHLIGHTS}
        fullText={GENERAL_RULES_FULL_TEXT}
        className="rounded-2xl border border-slate-300/80 bg-slate-50/80 p-5"
        detailsClassName="mt-4 rounded-xl border border-slate-300 bg-white px-4 py-3"
      />

      {isAdultVerified ? (
        <RuleSection
          title="문샤인랜드 성인 규칙"
          subtitle="성인인증 이용자가 성인 구역에서 지켜야 하는 추가 규칙입니다."
          highlights={ADULT_RULE_HIGHLIGHTS}
          fullText={ADULT_RULES_FULL_TEXT}
          className="rounded-2xl border border-rose-200/90 bg-rose-50/80 p-5"
          detailsClassName="mt-4 rounded-xl border border-rose-200 bg-white/90 px-4 py-3"
        />
      ) : null}
    </div>
  );
}