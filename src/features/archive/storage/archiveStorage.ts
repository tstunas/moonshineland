import "server-only";

export interface ArchiveRecord {
  key: string;
  title: string;
  description: string;
  savedAt: string;
  tags: string[];
}

export interface ArchiveStorage {
  listArchives(): Promise<ArchiveRecord[]>;
  readArchiveHtml(archiveKey: string): Promise<string | null>;
}

export type ArchiveStorageProviderName = "mock" | "local" | "object";

const MOCK_ARCHIVES: ArchiveRecord[] = [
  {
    key: "anchor-1-20260330-090000",
    title: "앵커판 1스레드 보관본",
    description: "실시간 스레드를 HTML로 고정 저장한 샘플 아카이브입니다.",
    savedAt: "2026-03-30T09:00:00.000Z",
    tags: ["앵커판", "보관", "HTML"],
  },
  {
    key: "orpg-12-20260329-221500",
    title: "OR판 12스레드 보관본",
    description: "OR 세션 진행 로그를 읽기 전용으로 보관한 샘플입니다.",
    savedAt: "2026-03-29T22:15:00.000Z",
    tags: ["OR판", "세션로그", "읽기전용"],
  },
  {
    key: "trans-4-20260328-184000",
    title: "번역판 4스레드 보관본",
    description: "번역 진행 스레드를 아카이브용 HTML로 변환한 샘플입니다.",
    savedAt: "2026-03-28T18:40:00.000Z",
    tags: ["번역판", "정리", "스냅샷"],
  },
  {
    key: "anchor-2-20260327-200500",
    title: "앵커판 2스레드 보관본",
    description: "장면 전개 로그를 정리한 샘플 보관본입니다.",
    savedAt: "2026-03-27T20:05:00.000Z",
    tags: ["앵커판", "로그", "스냅샷"],
  },
  {
    key: "orpg-8-20260326-235900",
    title: "OR판 8스레드 보관본",
    description: "전투 구간 중심으로 정리한 샘플 보관본입니다.",
    savedAt: "2026-03-26T23:59:00.000Z",
    tags: ["OR판", "전투", "아카이브"],
  },
  {
    key: "trans-2-20260325-131000",
    title: "번역판 2스레드 보관본",
    description: "중간 교정 버전을 보관한 샘플입니다.",
    savedAt: "2026-03-25T13:10:00.000Z",
    tags: ["번역판", "교정", "보관"],
  },
  {
    key: "honor-20260324-010500",
    title: "명예의 전당 큐레이션 보관본",
    description: "선정 글 모음을 HTML로 정리한 샘플입니다.",
    savedAt: "2026-03-24T01:05:00.000Z",
    tags: ["명예의전당", "큐레이션", "HTML"],
  },
];

const MOCK_ARCHIVE_HTML: Record<string, string> = {
  "anchor-1-20260330-090000": `
    <article>
      <header>
        <h2>앵커판 1스레드 보관본</h2>
        <p>실시간 흐름이 끝난 시점의 상태를 HTML로 고정한 아카이브 샘플입니다.</p>
      </header>
      <section>
        <p><strong>#1</strong> 진행자 (ABCD-1)</p>
        <div class="line">안건 정리 완료. 다음 진행은 토요일 21:00입니다.</div>
      </section>
      <section>
        <p><strong>#2</strong> 참가자 (QWER-9)</p>
        <div class="aa">　　　　　　　　　　　　　　　＿＿＿＿＿
　　　　　　　　　　　　／　　　　　　　＼
　　　　　　　　　　　/　　　회의 종료！　　\</div>
      </section>
    </article>
  `,
  "orpg-12-20260329-221500": `
    <article>
      <header>
        <h2>OR판 12스레드 보관본</h2>
        <p>세션 종료 시점 로그를 읽기 전용 문서처럼 보관한 샘플입니다.</p>
      </header>
      <section>
        <p><strong>#54</strong> GM (MNOP-7)</p>
        <p>전투 종료. 보상은 다음 회차 시작 전에 정산합니다.</p>
      </section>
      <section>
        <p><strong>#55</strong> 플레이어A (ZXCV-2)</p>
        <p><b>획득 보상:</b> 320G, 소형 회복 포션 2개</p>
      </section>
    </article>
  `,
  "trans-4-20260328-184000": `
    <article>
      <header>
        <h2>번역판 4스레드 보관본</h2>
        <p>검수 완료 본문을 고정 저장한 샘플입니다.</p>
      </header>
      <section>
        <p><strong>#18</strong> 번역자 (QWER-2)</p>
        <p>최종 교정 반영 완료. 이후 수정은 다음 버전에서 진행합니다.</p>
      </section>
      <section>
        <p><strong>#19</strong> 코멘트</p>
        <p><spo>원문 대비 표현 강도를 한 단계 낮췄습니다.</spo></p>
      </section>
    </article>
  `,
};

class MockArchiveStorage implements ArchiveStorage {
  async listArchives(): Promise<ArchiveRecord[]> {
    return [...MOCK_ARCHIVES].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  }

  async readArchiveHtml(archiveKey: string): Promise<string | null> {
    return MOCK_ARCHIVE_HTML[archiveKey] ?? null;
  }
}

class LocalFileArchiveStorage implements ArchiveStorage {
  async listArchives(): Promise<ArchiveRecord[]> {
    // TODO: 로컬 파일 스토리지 규격 확정 후 구현
    // 예: /storage/archives/*.json 메타 + *.html 본문
    return [];
  }

  async readArchiveHtml(_archiveKey: string): Promise<string | null> {
    // TODO: 로컬 파일 스토리지 규격 확정 후 구현
    return null;
  }
}

class ObjectArchiveStorage implements ArchiveStorage {
  async listArchives(): Promise<ArchiveRecord[]> {
    // TODO: 오브젝트 스토리지(S3/R2/MinIO 등) 사양 확정 후 구현
    return [];
  }

  async readArchiveHtml(_archiveKey: string): Promise<string | null> {
    // TODO: 오브젝트 스토리지(S3/R2/MinIO 등) 사양 확정 후 구현
    return null;
  }
}

const providerByName: Record<ArchiveStorageProviderName, ArchiveStorage> = {
  mock: new MockArchiveStorage(),
  local: new LocalFileArchiveStorage(),
  object: new ObjectArchiveStorage(),
};

function resolveProviderName(): ArchiveStorageProviderName {
  const provider = (process.env.ARCHIVE_STORAGE_PROVIDER ?? "mock").toLowerCase();

  if (provider === "local") {
    return "local";
  }

  if (provider === "object") {
    return "object";
  }

  return "mock";
}

export function getArchiveStorageProviderName(): ArchiveStorageProviderName {
  return resolveProviderName();
}

export function getArchiveStorage(): ArchiveStorage {
  return providerByName[resolveProviderName()];
}