async function run() {
  const res = await fetch("https://api.quran.com/api/v4/resources/recitations?language=ar");
  const data = await res.json();
  console.log(data.recitations.filter(r => r.reciter_name.includes("Maher") || r.reciter_name.includes("Muaiqly") || r.reciter_name.includes("المعيقلي")));
}
run();
