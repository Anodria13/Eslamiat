async function run() {
  const res = await fetch("https://api.qurancdn.com/api/qdc/audio/reciters");
  const data = await res.json();
  console.log(data.reciters.map(r => ({ id: r.id, name: r.name })));
}
run();
