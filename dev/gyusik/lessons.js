/*
규식이 (Gyusik) - https://github.com/sinsan-develop/regexr
Licensed under GPL-3.0 (see LICENSE, NOTICE.md).

Lesson content (Korean). Plain words first, the technical term in parentheses.
Each task: cases = strings the pattern must find (expect true) or must skip (expect false).
A case "finds" a string when the pattern matches anywhere in it, like the workbench test cases.
"examples" are shown as live railroad diagrams.
*/

const T = (text, expect) => ({text, expect});

export const LESSONS = [
	{
		id: "l1", title: "글자 그대로 찾기", term: "리터럴",
		body: [
			"<p>정규식에서 가장 쉬운 패턴은 <b>찾고 싶은 글자를 그대로 쓰는 것</b>입니다. <code>고양이</code> 라고 쓰면 \"고양이\"라는 글자가 들어 있는 곳을 찾습니다.</p>",
			"<p>패턴은 글자 하나하나를 <b>순서대로</b> 확인합니다. <code>abc</code> 는 a, b, c가 이 순서로 붙어 있을 때만 일치합니다. <code>acb</code> 나 <code>a-b-c</code> 에는 일치하지 않습니다.</p>",
			"<p>기본적으로 <b>대소문자를 구분</b>합니다. <code>cat</code> 은 \"Cat\"에 일치하지 않습니다. 구분하지 않으려면 작업대의 <code>i</code> 플래그를 켜세요.</p>"
		],
		examples: [{pattern: "고양이", note: "\"고양이\"가 이 순서로 있으면 일치"}],
		tasks: [
			{id: "l1t1", prompt: "\"고양이\"가 들어 있는 줄은 찾고, 들어 있지 않은 줄은 건너뛰세요.", cases: [T("회색 고양이", true), T("고양이", true), T("검은 고양이가 잔다", true), T("강아지", false), T("고 양 이", false)], hint: "찾고 싶은 글자를 그대로 쓰면 됩니다.", solution: "고양이"},
			{id: "l1t2", prompt: "\"2026\"이 들어 있는 줄만 찾으세요.", cases: [T("2026-10-11", true), T("제 2026 호", true), T("2025-10-11", false), T("20-26", false)], hint: "숫자도 글자와 똑같이 그대로 씁니다.", solution: "2026"}
		],
		next: "아무 글자나 하나, 점 <code>.</code> 을 배웁니다."
	},
	{
		id: "l2", title: "아무 글자 하나", term: "점 .",
		body: [
			"<p>글자가 정확히 정해지지 않았을 때는 <b>점(<code>.</code>)</b>을 씁니다. 점은 <b>아무 글자 하나</b>와 일치합니다. <code>c.t</code> 는 cat, cot, cut처럼 가운데가 무엇이든 되는 세 글자와 일치합니다.</p>",
			"<p>점은 한 글자만 대신합니다. 글자가 없거나 둘 이상이면 일치하지 않아서, <code>c.t</code> 는 \"ct\"나 \"coat\"에는 일치하지 않습니다.</p>",
			"<p><b>진짜 점을 찾고 싶다면</b> 앞에 역슬래시를 붙여 <code>\\.</code> 로 씁니다. 이처럼 특별한 뜻이 있는 기호를 글자 그대로 쓰게 만드는 것을 <b>이스케이프</b>라고 합니다. 파일 이름이나 도메인을 다룰 때 가장 자주 하는 실수가 이 부분입니다.</p>"
		],
		examples: [{pattern: "c.t", note: "가운데는 아무 글자 하나"}, {pattern: "3\\.14", note: "\\. 은 글자 점 그대로"}],
		tasks: [
			{id: "l2t1", prompt: "cat, cot, cut처럼 가운데만 다른 세 글자는 찾고, 글자 수가 다른 것은 건너뛰세요.", cases: [T("cat", true), T("cot", true), T("cut", true), T("ct", false), T("coat", false)], hint: "가운데 글자 하나를 점으로 바꿉니다.", solution: "c.t"},
			{id: "l2t2", prompt: "소수점이 있는 \"3.14\"만 찾고, \"3814\"는 건너뛰세요.", cases: [T("3.14", true), T("원주율은 3.14", true), T("3814", false), T("3-14", false)], hint: "점은 아무 글자와 일치하니, 글자 점은 \\. 로 씁니다.", solution: "3\\.14"}
		],
		next: "후보 글자 중 하나를 고르는 <code>[ ]</code> 를 배웁니다."
	},
	{
		id: "l3", title: "여러 글자 중 하나", term: "문자 집합 [ ]",
		body: [
			"<p>대괄호 <code>[ ]</code> 안에 글자를 늘어놓으면 <b>그중 한 글자</b>와 일치합니다. <code>[회흰]색</code> 은 \"회색\" 또는 \"흰색\"입니다.</p>",
			"<p>글자를 하나씩 쓰기 번거로울 때는 <b>범위</b>를 씁니다. <code>[0-9]</code> 는 숫자 하나, <code>[a-z]</code> 는 소문자 하나, <code>[가-힣]</code> 은 완성된 한글 한 글자입니다. 범위는 작은 것에서 큰 것 순서로 써야 합니다.</p>",
			"<p>맨 앞에 <code>^</code> 를 붙이면 <b>뜻이 반대</b>가 됩니다. <code>[^0-9]</code> 는 숫자가 <b>아닌</b> 글자 하나입니다. (대괄호 안의 <code>^</code> 는 아래 5강의 \"시작\"과 다른 뜻입니다.)</p>",
			"<p>자주 쓰는 집합에는 짧은 이름이 있습니다: <code>\\d</code> 는 숫자, <code>\\w</code> 는 글자·숫자·밑줄, <code>\\s</code> 는 공백 문자입니다. 대문자로 쓰면 반대(<code>\\D</code> 숫자가 아닌 글자)입니다.</p>"
		],
		examples: [{pattern: "[회흰]색", note: "회 또는 흰 한 글자 + 색"}, {pattern: "[^0-9]", note: "숫자가 아닌 글자 하나"}],
		tasks: [
			{id: "l3t1", prompt: "\"회색\"과 \"흰색\"은 찾고, \"검은색\"은 건너뛰세요.", cases: [T("회색", true), T("흰색", true), T("검은색", false)], hint: "첫 글자 자리에 올 수 있는 글자를 대괄호에 넣으세요.", solution: "[회흰]색"},
			{id: "l3t2", prompt: "알파벳 한 글자 뒤에 숫자 한 글자가 오는 \"A1\", \"b7\"은 찾고 \"AB\", \"12\"는 건너뛰세요. (대소문자 모두 허용)", cases: [T("A1", true), T("b7", true), T("Z9", true), T("AB", false), T("12", false)], hint: "[A-Za-z] 다음에 숫자 한 글자를 씁니다.", solution: "[A-Za-z][0-9]"},
			{id: "l3t3", prompt: "숫자가 하나도 없는 줄은 건너뛰고, 숫자가 아닌 글자가 있는 줄을 찾으세요.", cases: [T("abc", true), T("12a", true), T("1234", false), T("0", false)], hint: "[^0-9] 는 숫자가 아닌 글자 하나입니다.", solution: "[^0-9]"}
		],
		next: "몇 번 반복할지 정하는 <code>?  *  +  { }</code> 를 배웁니다."
	},
	{
		id: "l4", title: "몇 번 반복할지", term: "수량자",
		body: [
			"<p>글자나 집합 <b>바로 뒤</b>에 기호를 붙이면 그것이 몇 번 나올지 정할 수 있습니다.</p>",
			"<ul><li><code>?</code> 없거나 한 번 (있어도 되고 없어도 됨)</li><li><code>*</code> 없거나 여러 번 (0번 이상)</li><li><code>+</code> 한 번 이상</li><li><code>{4}</code> 정확히 4번</li><li><code>{2,4}</code> 2번 이상 4번 이하</li><li><code>{2,}</code> 2번 이상</li></ul>",
			"<p>기호는 <b>바로 앞의 한 글자</b>(또는 한 묶음)에만 적용됩니다. <code>ab+</code> 는 \"abab\"가 아니라 \"a 뒤에 b가 여러 개\"(ab, abb, abbb…)입니다. 여러 글자를 한꺼번에 반복하려면 6강의 묶음을 씁니다.</p>",
			"<p><code>.*</code> 는 \"아무 글자나 얼마든지\"라서 자주 쓰이지만 너무 많이 일치하기 쉽습니다. 이 문제는 7강(많이 vs 적게)에서 다룹니다.</p>"
		],
		examples: [{pattern: "colou?r", note: "u는 있어도 되고 없어도 됨"}, {pattern: "\\d{3}-\\d{4}", note: "숫자 3개, 하이픈, 숫자 4개"}],
		tasks: [
			{id: "l4t1", prompt: "미국식 \"color\"와 영국식 \"colour\"를 모두 찾으세요. \"colr\"은 건너뜁니다.", cases: [T("color", true), T("colour", true), T("colr", false), T("colouur", false)], hint: "있어도 되고 없어도 되는 글자 뒤에 ? 를 붙입니다.", solution: "colou?r"},
			{id: "l4t2", prompt: "숫자가 정확히 4개 이어진 곳(예: 연도)을 찾으세요. 숫자가 3개뿐인 줄은 건너뜁니다.", cases: [T("2026", true), T("1999년", true), T("202", false), T("abc", false)], hint: "\\d 뒤에 {4} 를 붙입니다.", solution: "\\d{4}"},
			{id: "l4t3", prompt: "\"a\" 뒤에 \"b\"가 한 번 이상 이어지는 곳을 찾으세요.", cases: [T("ab", true), T("abbbb", true), T("xabbx", true), T("a", false), T("bbb", false)], hint: "b 뒤에 + 를 붙입니다.", solution: "ab+"}
		],
		next: "글자의 <b>위치</b>를 정하는 <code>^</code> 와 <code>$</code> 를 배웁니다."
	},
	{
		id: "l5", title: "위치 정하기", term: "앵커 ^ $",
		body: [
			"<p>지금까지의 패턴은 줄 <b>어디에서든</b> 일치하면 찾아냅니다. 그래서 \"숫자 4개\"를 찾는 <code>\\d{4}</code> 는 \"20260\"이나 \"abc12345xyz\"에서도 찾아냅니다.</p>",
			"<p><code>^</code> 는 <b>시작</b>, <code>$</code> 는 <b>끝</b> 위치를 뜻합니다. 글자가 아니라 자리를 가리킵니다. <code>^010</code> 은 \"010으로 시작\", <code>\\.jpg$</code> 는 \".jpg로 끝\"입니다.</p>",
			"<p>둘을 함께 쓰면 <b>전체가 정확히 일치</b>해야 합니다. 입력값이 형식에 맞는지 검사할 때(전화번호, 우편번호 등) 거의 항상 <code>^</code> 와 <code>$</code> 로 감쌉니다. 빠뜨리면 \"abc010-1234xyz\" 같은 값도 통과합니다.</p>",
			"<p>그 밖에 <code>\\b</code> 는 <b>단어의 경계</b>입니다. <code>\\bcat\\b</code> 는 \"cat\"은 찾고 \"concatenate\" 속의 cat은 건너뜁니다.</p>"
		],
		examples: [{pattern: "^010", note: "010으로 시작"}, {pattern: "^\\d{5}$", note: "숫자 5개로만 이루어진 전체"}],
		tasks: [
			{id: "l5t1", prompt: "\"010\"으로 <b>시작하는</b> 줄만 찾으세요.", cases: [T("010-1234-5678", true), T("0101", true), T("번호 010-1234", false), T("110", false)], hint: "패턴 맨 앞에 ^ 를 붙입니다.", solution: "^010"},
			{id: "l5t2", prompt: "\".jpg\"로 <b>끝나는</b> 파일 이름만 찾으세요.", cases: [T("photo.jpg", true), T("a.b.jpg", true), T("photo.jpg.bak", false), T("jpg", false)], hint: "점은 \\. 로 쓰고, 맨 뒤에 $ 를 붙입니다.", solution: "\\.jpg$"},
			{id: "l5t3", prompt: "숫자 5개로만 이루어진 우편번호만 찾으세요. 더 길거나 글자가 섞이면 건너뜁니다.", cases: [T("12345", true), T("06236", true), T("123456", false), T("12a45", false), T("a12345", false)], hint: "^ 와 $ 로 감싸고 \\d{5} 를 가운데 넣습니다.", solution: "^\\d{5}$"}
		],
		next: "여러 글자를 한 묶음으로 다루는 <code>( )</code> 와 <code>|</code> 를 배웁니다."
	},
	{
		id: "l6", title: "묶고 선택하기", term: "그룹 ( ), 선택 |",
		body: [
			"<p>괄호 <code>( )</code> 는 여러 글자를 <b>하나의 묶음</b>으로 만듭니다. 묶음 뒤에 반복 기호를 붙이면 묶음 전체가 반복됩니다. <code>(ab)+</code> 는 ab, abab, ababab…입니다. (4강의 <code>ab+</code> 와 비교해 보세요.)</p>",
			"<p><code>|</code> 는 <b>또는</b>입니다. <code>고양이|강아지</code> 는 둘 중 하나를 찾습니다. 괄호와 함께 쓰면 범위를 정할 수 있어서 <code>(cat|dog)s?</code> 처럼 일부만 선택하게 할 수 있습니다.</p>",
			"<p><b>조심하세요:</b> <code>|</code> 는 괄호가 없으면 패턴 <b>전체</b>를 나눕니다. <code>^a|b$</code> 는 \"a로 시작하거나 b로 끝남\"이지 \"a 또는 b 하나만\"이 아닙니다. 전체를 맞추려면 <code>^(a|b)$</code> 로 씁니다.</p>",
			"<p>괄호로 묶은 부분은 <b>그룹</b>으로 번호가 붙어 기억됩니다(첫 괄호가 1번). 작업대에서 그룹마다 색이 다르게 보이고, 치환할 때 <code>$1</code> 로 다시 꺼내 쓸 수 있습니다. 기억하지 않고 묶기만 하려면 <code>(?:...)</code> 로 씁니다.</p>"
		],
		examples: [{pattern: "(ab)+", note: "ab 묶음이 한 번 이상"}, {pattern: "^(고양이|강아지)$", note: "둘 중 하나와 전체 일치"}],
		tasks: [
			{id: "l6t1", prompt: "\"고양이\" 또는 \"강아지\"가 들어 있는 줄을 찾으세요. \"토끼\"는 건너뜁니다.", cases: [T("고양이", true), T("강아지", true), T("검은 고양이", true), T("토끼", false)], hint: "두 단어를 | 로 이어 씁니다.", solution: "고양이|강아지"},
			{id: "l6t2", prompt: "\"ab\"가 한 번 이상 <b>반복되기만 하는</b> 줄을 찾으세요. 전체가 맞아야 합니다.", cases: [T("ab", true), T("abab", true), T("ababab", true), T("aabb", false), T("abb", false), T("", false)], hint: "^(ab)+$ 처럼 묶음 전체를 반복시킵니다.", solution: "^(ab)+$"},
			{id: "l6t3", prompt: "\"cat\", \"cats\", \"dog\", \"dogs\" <b>정확히 그 단어</b>만 찾으세요. \"catdog\"은 건너뜁니다.", cases: [T("cat", true), T("cats", true), T("dog", true), T("dogs", true), T("catdog", false), T("bird", false)], hint: "^(cat|dog)s?$ 처럼 선택을 괄호로 묶고 전체를 ^ $ 로 감쌉니다.", solution: "^(cat|dog)s?$"}
		],
		next: "1~6강을 모두 마쳤습니다. 작업대에서 직접 패턴을 만들어 보세요."
	}
];
