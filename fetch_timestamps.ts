async function run() {
  const res = await fetch("https://api.quran.com/api/v4/quran/recitations/7?chapter_number=1");
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
run();
