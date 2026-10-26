// 이용약관과 개인정보처리방침 본문 (테스트 운영판).
// 운영자가 검토할 초안이다. 학생 초대 전에 사람(가능하면 법률 전문가)의 검토가 필요하다 (logs/build/decisions.md).
// 섹션 순서대로 p(문단) → ul(목록) → after(목록 뒤 문단) → contact(문의처 블록) 로 그린다.
// contact 는 NEXT_PUBLIC_CONTACT_EMAIL 이 있으면 이메일, 없으면 게시판 안내 문장 (components/LegalDoc.tsx)

export type LegalSection = {
  h: string;
  p?: string[];
  ul?: string[];
  after?: string[];
  contact?: boolean;
};

type LegalDocs = { ko: LegalSection[]; en: LegalSection[] };

export const terms: LegalDocs = {
  ko: [
    {
      h: "1. 목적과 적용",
      p: [
        "이 약관은 강사 개인이 운영하는 온라인 어학 강의 사이트 Vita Language(이하 \"서비스\")를 이용하는 조건과 절차, 운영자와 이용자의 권리와 의무를 정합니다.",
        "서비스에 가입하거나 서비스를 이용하면 이 약관에 동의한 것으로 봅니다. 이 약관에서 \"운영자\"는 서비스를 운영하는 강사를, \"이용자\"는 서비스에 가입한 모든 사람을 말합니다.",
      ],
    },
    {
      h: "2. 서비스 내용",
      p: ["서비스는 다음 4개 과목의 온라인 수업을 제공합니다."],
      ul: ["스페인어 회화", "스페인어 내신", "한국어 회화", "TOPIK"],
      after: [
        "과목과 단계에 따라 영상 강의, 연습 문제와 모의고사, 15분 1:1 회화 콜, 라이브 수업(Google Meet), 과목별 Q&A 게시판을 이용할 수 있습니다. 단계별 구성은 요금제 페이지에 안내합니다.",
      ],
    },
    {
      h: "3. 테스트 운영",
      p: [
        "현재 서비스는 무료 테스트 운영 중입니다. 수강료를 받지 않으며 온라인 결제 기능도 없습니다.",
        "테스트 기간에는 기능, 과목 구성, 수업 일정이 바뀌거나 서비스가 일시 중단 또는 종료될 수 있습니다. 운영자는 이런 변경을 가능한 한 미리 공지사항으로 알립니다.",
        "앞으로 유료로 전환할 때는 요금, 결제, 환불 조건을 정한 약관을 따로 공지하고, 이용자가 동의한 경우에만 유료 서비스가 적용됩니다.",
      ],
    },
    {
      h: "4. 가입과 수강 승인",
      ul: [
        "가입은 Google 계정으로 로그인하거나, 이메일로 받은 로그인 링크를 여는 방식으로 합니다. 처음 로그인하면 계정이 만들어집니다.",
        "가입만으로는 강의를 볼 수 없습니다. 수강신청을 보내고 운영자가 승인하면 해당 과목을 이용할 수 있습니다.",
        "운영자는 정원, 수업 일정, 과목 수준 등을 고려해 수강신청을 승인하지 않을 수 있습니다.",
        "만 14세 미만은 법정대리인(보호자)의 동의를 받은 뒤에 승인합니다. 절차는 개인정보처리방침 7항에 적었습니다.",
        "만 14세 이상이라도 미성년자는 보호자에게 알리고 이용하기를 권합니다.",
        "다른 사람의 이메일이나 Google 계정으로 가입해서는 안 됩니다.",
      ],
    },
    {
      h: "5. 계정 관리와 한 계정 한 기기",
      ul: [
        "한 계정은 한 사람만 쓸 수 있습니다. 계정을 다른 사람에게 빌려주거나 함께 쓰면 안 됩니다.",
        "한 계정은 동시에 한 기기에서만 로그인됩니다. 다른 기기에서 로그인하면 먼저 쓰던 기기는 자동으로 로그아웃됩니다.",
        "강의 영상 위에는 계정 공유를 막기 위해 로그인한 이메일이 표시됩니다.",
        "로그인에 쓰는 Google 계정과 이메일함은 이용자가 직접 관리해야 합니다. 계정이 도용된 것 같으면 바로 운영자에게 알려 주세요.",
      ],
    },
    {
      h: "6. 수강 기간과 권한",
      ul: [
        "과목별 수강 기간과 단계는 운영자가 승인할 때 정하고 My Class에 표시합니다.",
        "수강 기간이 끝나면 강의, 문제, 라이브, 해당 과목 Q&A 이용이 멈춥니다. 이미 푼 문제의 점수와 내가 쓴 질문은 계속 볼 수 있습니다.",
        "회화 콜은 단계별로 정해진 월 횟수 안에서 예약할 수 있습니다. 횟수를 넘긴 예약은 운영자가 확인한 뒤 진행 여부를 알려 드립니다.",
      ],
    },
    {
      h: "7. 콘텐츠 저작권과 이용 제한",
      p: [
        "서비스의 영상 강의, 문제, 해설, 자료, 라이브 수업 내용의 저작권은 운영자(강사)에게 있습니다. 이용자는 자신의 학습을 위해서만 이용할 수 있습니다.",
      ],
      ul: [
        "강의 영상, 문제, 자료를 내려받거나 복제해서 다른 사람에게 주거나 인터넷에 올리면 안 됩니다.",
        "강의 영상, 라이브 수업, 회화 콜을 녹화하거나 녹음해서는 안 됩니다. 꼭 필요하면 미리 운영자의 허락을 받아야 합니다.",
        "강의 링크나 수업 입장 링크를 수강하지 않는 사람에게 공유하면 안 됩니다.",
        "콘텐츠를 영리 목적으로 쓰거나 다른 강의의 재료로 쓰면 안 됩니다.",
      ],
    },
    {
      h: "8. 게시판 이용 규칙",
      ul: [
        "Q&A 게시판은 해당 과목 수강생만 이용합니다. 수업과 관련된 질문을 남겨 주세요.",
        "다른 사람을 비난하거나 괴롭히는 글, 차별이나 혐오를 담은 글, 광고, 다른 사람의 개인정보, 저작권을 침해하는 글은 올리면 안 됩니다.",
        "운영자는 이 규칙에 어긋나는 글과 댓글을 숨기거나 지울 수 있습니다.",
        "이용자가 쓴 글의 권리는 이용자에게 있습니다. 다만 운영자는 서비스 안에서 그 글을 보여 주고 답변하는 데 필요한 범위에서 이용할 수 있습니다.",
        "비공개 질문은 질문한 사람과 운영자만 볼 수 있습니다.",
      ],
    },
    {
      h: "9. 회화 콜과 라이브 수업",
      ul: [
        "회화 콜은 Cal.com 예약 페이지에서 예약하고, 예약하면 Google Meet 링크가 만들어집니다.",
        "예약을 바꾸거나 취소하려면 예약 확인 메일의 안내에 따라 수업 전에 처리해 주세요.",
        "라이브 수업 입장 링크는 시작 30분 전부터 열립니다.",
        "수업 중에는 상대방의 동의 없이 녹화나 녹음을 하지 않습니다.",
      ],
    },
    {
      h: "10. 이용 제한",
      p: [
        "이용자가 계정을 공유하거나, 콘텐츠를 무단으로 퍼뜨리거나, 게시판 규칙을 반복해서 어기면 운영자는 해당 계정의 이용을 중지할 수 있습니다. 이용을 중지할 때는 이유를 알리고, 이용자는 운영자에게 이의를 제기할 수 있습니다.",
      ],
    },
    {
      h: "11. 탈퇴",
      p: [
        "이용자는 언제든 운영자에게 탈퇴를 요청할 수 있습니다. 탈퇴하면 계정과 학습 기록은 개인정보처리방침에 따라 지워집니다.",
      ],
    },
    {
      h: "12. 책임의 한계",
      ul: [
        "서비스는 테스트 운영 중인 무료 서비스입니다. 운영자는 서비스를 안정적으로 제공하려고 노력하지만, 중단이나 오류가 없다고 보장하지는 않습니다.",
        "Google, Cal.com, YouTube, 호스팅 업체 등 외부 서비스의 장애로 생긴 문제에 대해서는 운영자의 고의나 중대한 과실이 없는 한 책임을 지지 않습니다.",
        "강의와 문제는 학습을 돕기 위한 것이며, 특정 시험 점수나 합격을 보장하지 않습니다.",
        "이 조항은 법률이 허용하는 범위 안에서만 적용됩니다. 운영자의 고의나 중대한 과실로 생긴 손해, 법률상 배제할 수 없는 책임은 제한하지 않습니다.",
      ],
    },
    {
      h: "13. 약관의 변경",
      p: [
        "운영자는 필요하면 이 약관을 바꿀 수 있습니다. 바꿀 때는 시행 7일 전까지 공지사항으로 알리고, 이용자에게 불리한 변경은 30일 전까지 알립니다. 바뀐 약관에 동의하지 않으면 탈퇴할 수 있습니다.",
      ],
    },
    {
      h: "14. 준거법과 분쟁 해결",
      p: [
        "이 약관은 대한민국 법률을 따릅니다. 분쟁이 생기면 먼저 대화로 해결하고, 소송이 필요하면 민사소송법에 따른 관할 법원에서 다룹니다.",
        "대한민국 밖에 사는 이용자에게도 그 나라 법이 소비자에게 보장하는 강행 규정상의 보호는 그대로 적용됩니다.",
      ],
    },
    {
      h: "15. 문의",
      contact: true,
    },
  ],
  en: [
    {
      h: "1. Purpose and scope",
      p: [
        "These terms set out the conditions for using Vita Language (the \"Service\"), an online language class site run by an individual instructor, and the rights and duties of the operator and users.",
        "By signing up for or using the Service, you agree to these terms. In these terms, the \"operator\" is the instructor who runs the Service, and a \"user\" is anyone with an account.",
      ],
    },
    {
      h: "2. What the Service offers",
      p: ["The Service offers online classes in four courses:"],
      ul: ["Spanish conversation", "Spanish for school exams", "Korean conversation", "TOPIK"],
      after: [
        "Depending on the course and plan, you can use video lessons, practice sets and mock exams, 15-minute 1:1 speaking calls, live classes on Google Meet, and a Q&A board for each course. The Plans page shows what each plan includes.",
      ],
    },
    {
      h: "3. Test operation",
      p: [
        "The Service is currently in a free test run. No fees are charged and there is no online payment.",
        "During the test run, features, courses and schedules may change, and the Service may be paused or stopped. The operator will announce such changes on the Notices board in advance where possible.",
        "If paid plans are introduced later, separate terms covering fees, payment and refunds will be announced, and paid services will apply only to users who agree to them.",
      ],
    },
    {
      h: "4. Sign-up and approval",
      ul: [
        "You sign up by logging in with a Google account or by opening a login link sent to your email. Your first login creates your account.",
        "Signing up alone does not give access to lessons. You need to send an application, and the course opens once the operator approves it.",
        "The operator may decline an application, for example because of class size, schedule or course level.",
        "Users under 14 are approved only after a parent or legal guardian consents. Section 7 of the Privacy Policy explains how.",
        "Minors aged 14 or older are encouraged to tell a parent or guardian that they use the Service.",
        "Do not sign up with someone else's email or Google account.",
      ],
    },
    {
      h: "5. Your account and the one-device rule",
      ul: [
        "Each account is for one person. Do not lend or share your account.",
        "Each account can be logged in on one device at a time. Logging in on a new device logs out the previous one.",
        "To discourage account sharing, the email you logged in with is shown over lesson videos.",
        "You are responsible for the Google account or mailbox you use to log in. If you think your account has been misused, tell the operator right away.",
      ],
    },
    {
      h: "6. Access periods",
      ul: [
        "The operator sets the access period and plan for each course when approving it, and My Class shows them.",
        "When the access period ends, lessons, practice sets, live classes and the course Q&A close. You can still see scores from sets you finished and the questions you posted.",
        "You can book speaking calls up to the monthly number included in your plan. If a booking goes over that number, the operator will check it and let you know whether it goes ahead.",
      ],
    },
    {
      h: "7. Copyright and permitted use",
      p: [
        "The instructor owns the copyright in the video lessons, questions, explanations, materials and live class content. You may use them only for your own study.",
      ],
      ul: [
        "Do not download, copy, pass on or post lesson videos, questions or materials.",
        "Do not record lesson videos, live classes or speaking calls, by video or audio, unless the operator has agreed in advance.",
        "Do not share lesson links or class links with anyone who is not enrolled.",
        "Do not use the content for commercial purposes or as material for other courses.",
      ],
    },
    {
      h: "8. Q&A board rules",
      ul: [
        "Each Q&A board is for students enrolled in that course. Please post questions about the class.",
        "Do not post content that attacks or harasses others, contains discrimination or hate, advertises, reveals someone else's personal information, or infringes copyright.",
        "The operator may hide or remove posts and comments that break these rules.",
        "You keep the rights to what you post. The operator may use it within the Service as needed to display it and reply to it.",
        "Private questions are visible only to you and the operator.",
      ],
    },
    {
      h: "9. Speaking calls and live classes",
      ul: [
        "Speaking calls are booked on a Cal.com booking page, and a Google Meet link is created when you book.",
        "To change or cancel a booking, follow the instructions in your booking confirmation email before the call.",
        "Live class links open 30 minutes before the start.",
        "Neither side records a class without the other's consent.",
      ],
    },
    {
      h: "10. Suspension",
      p: [
        "If a user shares an account, distributes content without permission, or repeatedly breaks the board rules, the operator may suspend the account. The operator will tell the user why, and the user may raise an objection with the operator.",
      ],
    },
    {
      h: "11. Closing your account",
      p: [
        "You can ask the operator to close your account at any time. Your account and learning records will then be deleted as described in the Privacy Policy.",
      ],
    },
    {
      h: "12. Limitation of liability",
      ul: [
        "The Service is free and in a test run. The operator works to keep it running smoothly but does not guarantee that it will be free of interruptions or errors.",
        "The operator is not responsible for problems caused by outages of outside services such as Google, Cal.com, YouTube or the hosting providers, unless the operator acted intentionally or with gross negligence.",
        "Lessons and practice sets are study aids and do not guarantee any exam score or result.",
        "This section applies only as far as the law allows. It does not limit liability for harm caused intentionally or through gross negligence, or any liability that cannot be excluded by law.",
      ],
    },
    {
      h: "13. Changes to these terms",
      p: [
        "The operator may update these terms when needed. Changes will be announced on the Notices board at least 7 days before they take effect, or at least 30 days before for changes that are less favorable to users. If you do not agree to the new terms, you can close your account.",
      ],
    },
    {
      h: "14. Governing law and disputes",
      p: [
        "These terms are governed by the laws of the Republic of Korea. We will first try to resolve any dispute by talking it through. If a lawsuit is needed, it will be heard by the competent court under the Korean Civil Procedure Act.",
        "If you live outside Korea, you keep any mandatory consumer protections that the law of your country gives you.",
      ],
    },
    {
      h: "15. Contact",
      contact: true,
    },
  ],
};

export const privacy: LegalDocs = {
  ko: [
    {
      h: "1. 개요",
      p: [
        "Vita Language(이하 \"서비스\")는 강사 개인(이하 \"운영자\")이 운영하는 온라인 어학 강의 사이트입니다. 이 방침은 서비스가 어떤 개인정보를 왜 받고, 얼마 동안 보관하며, 누구에게 맡기는지, 이용자가 어떤 권리를 가지는지 설명합니다.",
        "서비스 이용자에는 고등학생 등 미성년자와 한국, 스페인에 사는 외국인 학습자가 포함됩니다. 그래서 대한민국 「개인정보 보호법」과 유럽연합 일반개인정보보호규정(GDPR)을 함께 고려해 작성했습니다.",
      ],
    },
    {
      h: "2. 받는 개인정보",
      ul: [
        "가입과 로그인: 이메일 주소, 이름(Google 로그인 때 Google 계정에 등록된 이름. 이메일 링크로 가입하면 이름 없이 가입됩니다), 화면 언어 설정, 회원 상태(승인 대기, 승인, 이용 중지), 가입 일시",
        "로그인 유지와 한 계정 한 기기 확인: 로그인 세션 토큰, 브라우저 정보(사용자 에이전트), 마지막 로그인 일시",
        "수강신청과 수강 관리: 신청 과목과 단계, 신청 때 남긴 말(학년, 현재 수준, 원하는 일정 등), 처리 결과, 수강 기간, 운영자가 수강 관리를 위해 남기는 메모",
        "학습 기록: 레슨 완료 기록, 문제와 모의고사 응시 기록(답안, 점수, 시작과 제출 시각), 서술형 답안 채점 결과",
        "회화 콜 예약: 예약 일시, 예약할 때 입력한 이름과 이메일, 과목, 예약 상태, Google Meet 링크",
        "게시판: 질문과 댓글 내용, 작성 일시",
        "합격 성과와 수강후기(본인이 동의한 경우만): 가린 이름(예: 김**), 과목, 성과, 연도, 후기 내용. 운영자가 직접 입력합니다.",
        "자동으로 생기는 정보: 서비스에 접속할 때 호스팅 서비스에 접속 기록(IP 주소, 접속 일시, 요청한 페이지)이 남을 수 있습니다.",
      ],
      after: [
        "정보는 Google 로그인(Google이 이름과 이메일을 전달), 이메일 로그인 링크 요청, 수강신청과 게시판 입력, Cal.com 예약, 서비스 이용 중 자동 생성의 방법으로 받습니다.",
        "서비스는 주민등록번호 같은 고유식별정보, 결제 정보, 주소, 전화번호를 받지 않습니다.",
      ],
    },
    {
      h: "3. 이용 목적",
      ul: [
        "회원 확인, 로그인, 수강신청 승인과 수강 권한 관리",
        "영상 강의, 문제 채점, 학습 기록 제공",
        "회화 콜과 라이브 수업 일정 운영",
        "Q&A 질문에 대한 답변",
        "계정 공유 방지와 보안(한 계정 한 기기 확인, 강의 영상 위 이메일 표시)",
        "서비스 변경, 중단 등 꼭 필요한 안내",
      ],
      after: ["광고나 마케팅 메일에는 개인정보를 쓰지 않습니다."],
    },
    {
      h: "4. 보관 기간과 파기",
      ul: [
        "회원 정보, 학습 기록, 수강신청 기록, 게시글과 댓글: 탈퇴(삭제 요청) 때까지 보관하고, 요청을 받은 날부터 5일 이내에 지웁니다.",
        "로그인 세션 정보: 새로 로그인할 때마다 새 값으로 바뀌고, 탈퇴 때 함께 지웁니다.",
        "회화 콜 예약 기록: 탈퇴 때 서비스에 남은 기록과 운영자의 Cal.com 계정에 남은 예약 기록을 함께 지웁니다.",
        "합격 성과와 수강후기: 본인이 삭제나 동의 철회를 요청하면 바로 내리고 지웁니다.",
        "접속 기록: 운영자가 따로 보관하지 않습니다. 호스팅 서비스에 남는 기록은 각 서비스가 정한 짧은 기간(보통 30일 이내)이 지나면 자동으로 지워집니다.",
        "테스트 운영이 끝나고 정식 서비스로 이어지지 않으면, 종료를 공지한 뒤 30일 이내에 모든 회원 정보를 지웁니다.",
      ],
      after: [
        "지금은 결제가 없어 법령에 따라 따로 보관해야 하는 정보가 없습니다. 결제를 시작하면 이 방침을 고쳐 미리 알립니다.",
        "전자 파일은 복구할 수 없는 방법으로 지웁니다. 서비스 백업에 남은 사본은 백업 보관 기간이 지나면 자동으로 지워집니다.",
      ],
    },
    {
      h: "5. 처리 위탁과 국외 이전",
      p: ["서비스 운영을 위해 다음 업체에 개인정보 처리를 맡기거나, 이용자가 해당 기능을 쓸 때 정보가 전달됩니다."],
      ul: [
        "Supabase, Inc.(미국 법인): 데이터베이스, 로그인 처리, 로그인 링크 메일 발송. 데이터 저장 위치는 대한민국 서울(AWS ap-northeast-2)입니다.",
        "Vercel Inc.(미국 법인): 웹사이트 호스팅과 서버 실행. 서버 실행 위치는 서울(icn1)이며, 화면 파일은 이용자와 가까운 Vercel 네트워크를 거쳐 전달될 수 있습니다.",
        "Google LLC(미국): Google 로그인(이름, 이메일), 회화 콜과 라이브 수업용 Google Meet(참석자 이메일, 수업 일시).",
        "Cal.com, Inc.(미국): 회화 콜 예약. 예약할 때 이름, 이메일, 회원 식별번호, 과목, 예약 일시가 Cal.com으로 전송되어 그 회사의 서버(미국 등)에 저장됩니다.",
        "YouTube(Google LLC): 강의 영상 재생. 개인정보 보호 강화 모드(youtube-nocookie.com)로 넣었고, 영상을 재생하면 YouTube가 자체 방침에 따라 시청 정보를 처리할 수 있습니다.",
      ],
      after: [
        "국외로 전달되는 정보는 이용자가 해당 기능을 쓰는 시점에 네트워크로 전송되며, 각 회사는 위탁 목적을 마치거나 운영자가 삭제를 요청할 때까지, 또는 각 회사의 방침에 따른 기간 동안 보관합니다.",
        "국외 이전을 원하지 않으면 Google 로그인 대신 이메일 로그인 링크를 쓰고, 회화 콜 예약을 하지 않으면 됩니다. 이 경우 회화 콜 기능은 이용할 수 없습니다.",
      ],
    },
    {
      h: "6. 제3자 제공",
      p: [
        "운영자는 이용자의 개인정보를 다른 사람이나 회사에 팔거나 제공하지 않습니다. 법령에 따라 수사기관 등이 정당한 절차로 요구하는 경우만 예외입니다.",
      ],
    },
    {
      h: "7. 만 14세 미만 이용자",
      p: [
        "「개인정보 보호법」 제22조의2에 따라 만 14세 미만 아동의 개인정보를 처리하려면 법정대리인(보호자)의 동의가 필요합니다. 스페인 법(개인정보보호기본법 제7조)도 만 14세 미만은 보호자 동의를 받도록 정하고 있습니다.",
      ],
      ul: [
        "만 14세 미만 학생은 수강신청의 남길 말에 만 14세 미만이라고 적어 주세요.",
        "보호자는 아래 문의처로 학생 이름, 학생이 가입한 이메일, 보호자 이름과 연락처, 동의한다는 뜻을 이메일로 보내 주세요.",
        "운영자는 보호자 연락처로 동의 여부를 확인한 뒤에 수강을 승인합니다. 동의를 확인하지 못하면 승인하지 않고, 확인 요청 후 30일이 지나면 받은 정보를 지웁니다.",
        "보호자는 언제든 아이의 정보를 열람하거나 고치거나 지워 달라고 요청하고, 동의를 철회할 수 있습니다.",
      ],
    },
    {
      h: "8. 이용자의 권리와 행사 방법",
      ul: [
        "이용자는 자신의 개인정보를 열람하고, 틀린 내용을 고치고, 지우고, 처리를 멈추라고 요청하고, 동의를 철회할 수 있습니다.",
        "게시판에 쓴 질문과 댓글은 직접 지울 수 있습니다. 그 밖의 요청은 아래 문의처로 보내 주세요.",
        "운영자는 요청을 받은 날부터 10일 이내에 처리하고 결과를 알립니다. 법령상 보관해야 하는 정보처럼 요청을 들어줄 수 없으면 그 이유를 알립니다.",
        "만 14세 미만 이용자의 권리는 보호자가 대신 행사할 수 있습니다.",
      ],
    },
    {
      h: "9. 유럽연합(스페인 포함) 이용자",
      p: [
        "유럽연합에 사는 이용자의 개인정보에 대해 운영자는 GDPR상 개인정보처리자(controller)입니다.",
      ],
      ul: [
        "처리 근거: 수업 제공에 필요한 처리는 계약 이행(제6조 1항 b), 계정 공유 방지와 보안은 정당한 이익(제6조 1항 f), 합격 성과와 수강후기 게시는 본인 동의(제6조 1항 a)입니다.",
        "권리: 열람, 정정, 삭제, 처리 제한, 처리 반대, 데이터 이동(받은 정보를 기계가 읽을 수 있는 형식으로 받기), 동의 철회를 요청할 수 있습니다. 요청은 1개월 이내에 처리합니다.",
        "국외 이전: 데이터는 대한민국(서울)에 저장됩니다. 대한민국은 유럽연합 집행위원회의 적정성 결정을 받은 나라입니다. 미국 업체로 전달되는 정보는 각 업체가 마련한 표준계약조항이나 EU-미국 데이터 프라이버시 프레임워크 같은 보호 조치에 따릅니다.",
        "불만 제기: 운영자의 처리에 문제가 있다고 생각하면 사는 나라의 개인정보 감독기관에 불만을 제기할 수 있습니다. 스페인은 스페인 개인정보보호청(AEPD, www.aepd.es)입니다.",
      ],
    },
    {
      h: "10. 쿠키",
      p: [
        "서비스는 로그인 유지(Supabase 로그인 쿠키), 한 계정 한 기기 확인(vita_sid, 30일), 화면 언어 기억에 꼭 필요한 쿠키만 씁니다. 광고나 방문 분석 쿠키는 쓰지 않습니다.",
        "브라우저 설정에서 쿠키를 막을 수 있지만, 그러면 로그인이 되지 않습니다.",
      ],
    },
    {
      h: "11. 안전성 확보 조치",
      ul: [
        "모든 통신은 HTTPS로 암호화합니다.",
        "데이터베이스는 행 단위 접근 제어를 적용해 이용자는 자신의 정보만 볼 수 있고, 관리 화면은 운영자만 들어갈 수 있습니다.",
        "관리용 비밀 키는 서버에만 두고 브라우저로 보내지 않습니다.",
        "서비스 운영에 필요한 최소한의 정보만 받습니다.",
      ],
    },
    {
      h: "12. 개인정보 보호책임자와 문의",
      p: [
        "개인정보 보호책임자는 서비스 운영자(강사)입니다. 개인정보와 관련된 문의, 열람이나 삭제 요청, 보호자 동의는 아래로 보내 주세요.",
      ],
      contact: true,
    },
    {
      h: "13. 권익 침해 구제 방법",
      p: ["개인정보 침해로 상담이나 구제가 필요하면 다음 기관에 문의할 수 있습니다."],
      ul: [
        "개인정보분쟁조정위원회: 1833-6972, www.kopico.go.kr",
        "개인정보침해신고센터(한국인터넷진흥원): 118, privacy.kisa.or.kr",
        "대검찰청: 1301, www.spo.go.kr",
        "경찰청: 182, ecrm.police.go.kr",
      ],
    },
    {
      h: "14. 방침의 변경",
      p: [
        "이 방침을 바꾸면 시행 7일 전까지 공지사항으로 알립니다. 받는 정보나 이용 목적이 늘어나는 등 중요한 변경은 30일 전까지 알리고, 필요하면 다시 동의를 받습니다.",
      ],
    },
  ],
  en: [
    {
      h: "1. Overview",
      p: [
        "Vita Language (the \"Service\") is an online language class site run by an individual instructor (the \"operator\"). This policy explains what personal information the Service collects and why, how long it is kept, who processes it on the operator's behalf, and what rights you have.",
        "Users include minors such as high school students, and learners living in Korea and Spain. This policy was written with both the Korean Personal Information Protection Act (PIPA) and the EU General Data Protection Regulation (GDPR) in mind.",
      ],
    },
    {
      h: "2. Information we collect",
      ul: [
        "Sign-up and login: email address, name (the name on your Google account if you log in with Google; email link sign-ups have no name), display language, account status (waiting for approval, approved, suspended), sign-up date",
        "Staying logged in and the one-device rule: login session token, browser information (user agent), time of last login",
        "Applications and enrollment: course and plan applied for, the note you add (school year, level, preferred schedule and so on), the decision, access period, and notes the operator keeps to manage enrollment",
        "Learning records: completed lessons, practice set and mock exam attempts (answers, scores, start and submit times), grading of written answers",
        "Speaking call bookings: booking time, the name and email entered when booking, course, booking status, Google Meet link",
        "Q&A board: your questions and comments, and when they were posted",
        "Results and reviews (only if you agree): masked name (for example K**), course, result, year, review text. The operator enters these.",
        "Generated automatically: when you visit the Service, the hosting providers may log access records (IP address, time, page requested).",
      ],
      after: [
        "We get this information through Google login (Google passes on your name and email), email login link requests, what you enter in applications and on the board, Cal.com bookings, and automatically while you use the Service.",
        "The Service does not collect national ID numbers, payment details, postal addresses or phone numbers.",
      ],
    },
    {
      h: "3. Why we use it",
      ul: [
        "To identify you, log you in, approve applications and manage course access",
        "To provide video lessons, grade practice sets and keep learning records",
        "To run speaking calls and live classes",
        "To answer Q&A questions",
        "To prevent account sharing and keep the Service secure (one-device check, email shown over lesson videos)",
        "To send necessary notices, such as changes to or suspension of the Service",
      ],
      after: ["Your information is not used for advertising or marketing emails."],
    },
    {
      h: "4. How long we keep it",
      ul: [
        "Account information, learning records, applications, posts and comments: kept until you close your account (ask for deletion), and deleted within 5 days of your request.",
        "Login session information: replaced with a new value each time you log in, and deleted when your account is closed.",
        "Speaking call bookings: when your account is closed, the operator deletes the records in the Service and the booking records in the operator's Cal.com account.",
        "Results and reviews: taken down and deleted as soon as you ask or withdraw consent.",
        "Access logs: the operator does not keep them separately. Logs held by the hosting providers are deleted automatically after the short period each provider sets (usually 30 days or less).",
        "If the test run ends and the Service does not continue as a full service, all account information will be deleted within 30 days after the closure is announced.",
      ],
      after: [
        "There is no payment now, so no information must be kept under laws on transaction records. If payment is introduced, this policy will be updated in advance.",
        "Electronic data is deleted so that it cannot be recovered. Copies in Service backups are removed automatically when the backup retention period ends.",
      ],
    },
    {
      h: "5. Processors and international transfers",
      p: ["The following companies process personal information on the operator's behalf, or receive it when you use the related feature."],
      ul: [
        "Supabase, Inc. (US company): database, login, and sending login link emails. Data is stored in Seoul, Korea (AWS ap-northeast-2).",
        "Vercel Inc. (US company): website hosting and server functions. Server functions run in Seoul (icn1); page files may be delivered through the Vercel network location closest to you.",
        "Google LLC (US): Google login (name, email), and Google Meet for speaking calls and live classes (attendee email, class time).",
        "Cal.com, Inc. (US): speaking call booking. When you book, your name, email, member ID, course and booking time are sent to Cal.com and stored on its servers (in the US or elsewhere).",
        "YouTube (Google LLC): lesson video playback. Videos are embedded in privacy-enhanced mode (youtube-nocookie.com); when you play a video, YouTube may process viewing information under its own policy.",
      ],
      after: [
        "Information sent abroad is transmitted over the network when you use the feature, and each company keeps it until the processing purpose ends or the operator asks for deletion, or for the period set by that company's policy.",
        "If you do not want your information sent abroad, use an email login link instead of Google login and do not book speaking calls. In that case, you cannot use speaking calls.",
      ],
    },
    {
      h: "6. Sharing with third parties",
      p: [
        "The operator does not sell or give your personal information to other people or companies, except when required by law through proper legal process, for example by investigative authorities.",
      ],
    },
    {
      h: "7. Users under 14",
      p: [
        "Under Article 22-2 of the Korean PIPA, processing the personal information of a child under 14 requires consent from a parent or legal guardian. Spanish law (Article 7 of the Organic Law on Data Protection) also requires guardian consent for children under 14.",
      ],
      ul: [
        "If you are under 14, say so in the note on your application.",
        "Your parent or guardian should email the contact below with your name, the email you signed up with, their own name and contact details, and a statement that they consent.",
        "The operator confirms consent through the guardian's contact details before approving the application. Without confirmed consent, the application is not approved, and the information received is deleted 30 days after the request for confirmation.",
        "A parent or guardian can ask at any time to see, correct or delete the child's information, or withdraw consent.",
      ],
    },
    {
      h: "8. Your rights",
      ul: [
        "You can ask to see your personal information, correct it, delete it, stop its processing, or withdraw your consent.",
        "You can delete your own questions and comments on the board yourself. For anything else, contact the operator below.",
        "The operator will act on your request within 10 days and tell you the result. If a request cannot be met, for example because the law requires the information to be kept, you will be told why.",
        "A parent or guardian can exercise these rights for a user under 14.",
      ],
    },
    {
      h: "9. Users in the EU, including Spain",
      p: [
        "For users living in the European Union, the operator is the controller of their personal data under the GDPR.",
      ],
      ul: [
        "Legal bases: processing needed to provide classes is based on performance of a contract (Art. 6(1)(b)); preventing account sharing and security on legitimate interests (Art. 6(1)(f)); publishing results and reviews on your consent (Art. 6(1)(a)).",
        "Your rights: access, rectification, erasure, restriction of processing, objection, data portability (receiving your data in a machine-readable format), and withdrawal of consent. Requests are handled within one month.",
        "International transfers: data is stored in Seoul, Korea. The Republic of Korea has an adequacy decision from the European Commission. Information sent to US companies is covered by the safeguards each company provides, such as Standard Contractual Clauses or the EU-US Data Privacy Framework.",
        "Complaints: if you think your data has been handled improperly, you can complain to the data protection authority in your country. In Spain this is the Agencia Española de Protección de Datos (AEPD, www.aepd.es).",
      ],
    },
    {
      h: "10. Cookies",
      p: [
        "The Service uses only cookies that are strictly necessary: to keep you logged in (Supabase login cookies), to check the one-device rule (vita_sid, 30 days), and to remember your display language. There are no advertising or analytics cookies.",
        "You can block cookies in your browser settings, but you will not be able to log in.",
      ],
    },
    {
      h: "11. Security",
      ul: [
        "All traffic is encrypted with HTTPS.",
        "The database uses row-level access control, so users can see only their own information, and only the operator can open the admin pages.",
        "Admin secret keys stay on the server and are never sent to the browser.",
        "The Service collects only the information it needs to run.",
      ],
    },
    {
      h: "12. Privacy officer and contact",
      p: [
        "The privacy officer is the operator (the instructor) of the Service. Send privacy questions, requests to see or delete your information, and guardian consent to the contact below.",
      ],
      contact: true,
    },
    {
      h: "13. Help with privacy complaints in Korea",
      p: ["For advice or remedies regarding a privacy violation, you can contact these Korean bodies:"],
      ul: [
        "Personal Information Dispute Mediation Committee: 1833-6972, www.kopico.go.kr",
        "Personal Information Infringement Report Center (KISA): 118, privacy.kisa.or.kr",
        "Supreme Prosecutors' Office: 1301, www.spo.go.kr",
        "Korean National Police Agency: 182, ecrm.police.go.kr",
      ],
    },
    {
      h: "14. Changes to this policy",
      p: [
        "Changes to this policy will be announced on the Notices board at least 7 days before they take effect. Important changes, such as collecting more information or using it for new purposes, will be announced at least 30 days in advance, and consent will be asked for again where needed.",
      ],
    },
  ],
};
