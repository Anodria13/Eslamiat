async function run() {
  const res = await fetch("https://api.quran.com/api/v4/resources/recitations?language=ar");
  const data = await res.json();
  console.log(data.recitations.map(r => ({ id: r.id, name: r.reciter_name })));
}
run();
