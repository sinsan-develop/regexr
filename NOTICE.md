# NOTICE

규식이 (Gyusik)

- Original work: RegExr, Copyright (C) 2017 gskinner.com, inc. — https://github.com/gskinner/regexr
- Modifications: Copyright (C) 2026 sinsan-develop — https://github.com/sinsan-develop/regexr

This program is free software: you can redistribute it and/or modify it under the terms of the
GNU General Public License as published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version. See [LICENSE](LICENSE).

"RegExr" is the name of the original project by gskinner.com, inc. 규식이 is an independent
modified version and is not affiliated with or endorsed by gskinner.com, inc.

## 수정 내역 (Modifications)

수정한 소스 파일에는 머리 주석에 `Modified for 규식이 (Gyusik) by sinsan-develop, <날짜>` 줄을 넣습니다.

### 2026-10-11

- 이름을 규식이로 바꿨습니다. 페이지 제목, 메타 정보, 헤더 로고(글자 로고), 소개 문구, 도움말의 About이 해당합니다.
- 헤더 링크를 "RegExr 기반"(원본 저장소)과 "소스 코드"(이 저장소)로 바꿨습니다.
- Google Analytics(gtag.js)를 제거했습니다. `Track` 모듈은 아무 일도 하지 않는 함수로 남겼습니다.
- 광고 스크립트(`dev/lib/native.js`, Carbon/BuySellAds)와 광고 영역 마크업, 스타일(`dev/sass/views/ad.scss`)을 제거했습니다.
- Google Fonts 요청을 제거했습니다. 시스템 글꼴과 한글 글꼴을 대체로 지정했습니다(`dev/sass/fonts.scss`).
- regexr.com 서버 호출을 제거했습니다(`Server.url = null`). 서버가 필요한 기능(저장, 공유, 커뮤니티, 로그인, PCRE 실행)은 네트워크 요청 없이 "준비 중" 안내를 보여줍니다. 로그인 버튼은 숨겼습니다.
- 서버 오류 결과에 `mode`가 빠져 엔진 오류가 화면에 표시되지 않던 문제를 고쳤습니다(`ServerSolver`).
- 저장 오류 문구가 "no docs for error"로 나오던 문제를 고쳤습니다(`Share._getErrMsg`).
- 로컬 실행 시 테스트 계정 대신 익명 사용자로 시작합니다.
- 빌드: `gulp-sass`를 5.1로 올리고 dart-sass(`sass`)를 직접 넘기도록 바꿨습니다. 이전 버전이 끌어오던 node-sass는 현재 Node에서 빌드되지 않습니다. 개발 서버가 브라우저를 자동으로 열지 않도록 하고, 포트를 3350으로 바꿨습니다.
- README를 규식이용으로 새로 쓰고, 원본 README는 `README.RegExr.md`로 보존했습니다.
