async function run() {
  const res = await fetch("https://api.quran.com/api/v4/recitations/7/by_chapter/1");
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
run();
