"use client";

import { useState } from "react";

const tools = [
  {
    id: 1,
    code: "X657 X657C X657B Itel Vision 1 Plus Itel Vision 1 Pro Itel Vision 2S Itel P36 Itel P37 Itel S16 Infinix Smart 5A Infinix Smart 5 Infinix Hot 10 Lite KF6 Tecno Spark 7",
  },
  {
    id: 2,
    code: "Infinix Smart HD Infinix Smart HD 2021 X612 X612B",
  },
  {
    id: 3,
    code: "Tecno KE5 KE5S KE5K Tecno Spark 6 GO Tecno Spark GO 2020 SPARKGO 2021",
  },
  {
    id: 4,
    code: "Infinix Smart 6 HD Infinix Smart HD 2022 Infinix Hot 12i Infinix Hot 20i X6511C X6512 X665",
  },
  {
    id: 5,
    code: "KG5 BD4 Tecno POP 5 LTE BD4J KG5H KG5M Tecno POP 5 PRO BD4A BD4H BD4I SPARK GO 2022",
  },
  {
    id: 6,
    code: "Itel A60 Itel A60S Infinix Smart 7 Tecno Spark 10 Tecno Pop 7 Pro Tecno Pop 7 Tecno Spark 10C Itel P40 Tecno Spark Go 2023 Tecno Spark 10 5G Infinix Smart 7 HD X6517 X669 BF6 X6516 X6515 X6515 KI5Q KI5N KI5K BF7 BF7H BF7N BF7S P662L KI8 X669C A70 P40 A50 A60 A60S S23 A05S KI5 KI8 P55 5G Smart 7 Smart 7 HD Hot 30i Spark GO 2023 Spark 10 Pop 7 ZTE A34 ZTE A54",
  },
  {
    id: 7,
    code: "Infinix Hot 9 Play Infinix Smart 4 Plus X680B X680C X680 X680F",
  },
  {
    id: 8,
    code: "Infinix Hot 10 Play Infinix Hot 11 Play Pova Neo LE6 Spark 7 Itel P37 Pro Vision 2 Plus P681L P681LM X688 X688B X688C LE6H KF7",
  },
  {
    id: 9,
    code: "Infinix Hot 10 Pova 1 Pova Camon 16 Infinix Hot 10i Tecno Spark 6 Infinix Note 8i X683 X682B CE7 CE7I X682C X682 LD7 LD7J X683C KE7",
  },
  {
    id: 10,
    code: "KG6K A58 PRO SPARK 8 SMART 6 PLUS S17 A58 A661W S661W A661L Itel S17 Itel A58 Itel A58 Pro Itel A49 X6511G",
  },
  {
    id: 11,
    code: "Itel Vision 3 S661L Tecno Spark 9 Itel S18 Itel Vision 3 Tecno Spark 8C Tecno Spark 9T Itel Vision 5 Itel P38 KG5P KG5J KG5K KH6 KG5KS KG5Q",
  },
  {
    id: 12,
    code: "Infinix Note 11 Infinix Note 12 Turbo Infinix Note 12 5G Infinix Note 12 Pro X663 X663D X676B X670 X671 X6716",
  },
  {
    id: 13,
    code: "Infinix Smart 6 Plus Infinix Hot 10S Infinix Hot 10T Tecno Spark 7P Itel P38 Pro Itel Vision 3 Plus Infinix Hot 11 X6823 X689 X6823C X689B X689D X689C X689F KF7J",
  },
  {
    id: 14,
    code: "Infinix Hot 12 Infinix Note 12i Infinix Hot 20 Infinix Hot 20 Play Pova Neo 2 Infinix Hot 12 Play Itel P40 Plus X6816C X6816D X6816 X6817 X6819 X6825 X6826 LG6 LG6N Pova 4 LG7N",
  },
  {
    id: 15,
    code: "Infinix X650 KC2 KC8 CC7 Infinix HOT 8 Infinix HOT 8 PRO Tecno SPARK 4",
  },
  {
    id: 16,
    code: "Tecno KF6 Tecno SPARK 7T Tecno SPARK 7 Tecno KG6 Infinix X659 Infinix X658 Tecno Spark 7T KF6H KF6J KG6 Tecno Spark 8 KE5",
  },
  {
    id: 17,
    code: "X6525 X6526 X6528 Infinix Smart 8 Tecno Spark Go 2024 Infinix Smart 8HD Tecno Spark 20 Tecno Spark 20C Infinix Hot 40i Tecno Pop 8 Itel P55 Itel P55+ Itel P55T A666L Itel S23 Plus Itel S23+ Itel S18 Pro Itel S24 Itel RS4 BG7 KJ5 BG6 BG6H BG6M",
  },
  {
    id: 18,
    code: "Infinix Hot 9 Infinix Hot 9 Pro Infinix Note 7 Lite Camon 15 Air Camon 15 Tecno Spark 5 Pro Tecno Spark 5 X655C X655 X655D X655F X656 DC6 DC7 KD7 KD7S KD7H",
  },
  {
    id: 19,
    code: "Itel P36 Play Itel Vision 1",
  },
  {
    id: 20,
    code: "Itel S16 Pro Itel Vision 2 L6503",
  },
  {
    id: 21,
    code: "Tecno Spark 5 Air KD6 KD6A Tecno Spark 6 Air KE6 KE6J Tecno Pouvoir 4 LC7 KE3 Tecno Pouvoir 4 Pro LC8 Tecno Spark 2 Air Tecno Spark Power 2",
  },
  {
    id: 22,
    code: "CK6 CK7 CK8N CK9 Infinix X6739 Infinix X678B Infinix X6710 Camon 20 Camon GT 10 Pro Tecno GT 10 Pro Tecno Camon 20 Tecno Camon 20 Pro Tecno Camon 20 Pro 5G",
  },
  {
    id: 23,
    code: "Infinix S5 Infinix S5 Lite Tecno Camon 12 Air KC3 CC3 X652",
  },
  {
    id: 24,
    code: "X6827 Infinix Hot 20 Pro Tecno Spark 8 Pro KG8 X6812B Tecno Camon 17P CG7 Tecno Pova LE6J Neo 5G Infinix Zero 5G X6815B X6812 Infinix Hot 11S Tecno Camon 18 CH6 Tecno Camon 19 Neo CH6I Infinix Zero 5G 2023 X6815D Tecno Camon 18P CH7N",
  },
  {
    id: 25,
    code: "Infinix X693 Infinix NOTE 10 Tecno POVA 2 Tecno POVA 5G Tecno POVA 3 LE7 LE8 LF7 Infinix X698 X697 Infinix NOTE 11i Infinix NOTE 11S Infinix NOTE 11 PRO",
  },
  {
    id: 26,
    code: "X6831 X6711 X6838 X6837 X6832 X6836 Tecno Spark 20 Pro KJ6 Infinix Hot 40 Tecno Spark 10 Pro KI7 Infinix Hot 30 5G Infinix Note 30 5G Infinix Hot 40 Pro Pova 5 Pro 5G LH7N Tecno Spark 20 Pro 5G KJ8 Infinix Note 40X 5G",
  },
  {
    id: 27,
    code: "Itel A06 Itel A50C Itel A669W Itel A669L",
  },
  {
    id: 28,
    code: "X668 X668C Infinix Hot 12 Infinix Hot 12 Pro Tecno Pop 6 Pro BE4 BE8 Infinix Pop 6 Pro",
  },
  {
    id: 29,
    code: "Infinix Smart 4 Tecno Pop 3 Plus BB4K BB4 X653C X653",
  },
  {
    id: 30,
    code: "Tecno CC6 Infinix X655 Tecno KD7 Infinix X652B Tecno KC3 Tecno KD7H Tecno CD7 X655C X656 C653C X6524 Tecno CD6 CC6",
  },
  {
    id: 31,
    code: "Infinix Hot 50 5G X6720 Infinix Hot 50i X6531 Infinix Smart 9 X6532 Tecno Spark Go 1 KL4 Tecno Spark 30 5G KL8 Itel P65 Itel P671L Tecno Spark 30C KL5N Itel A80 Itel A671LC Pova 6 Neo 5G Tecno Pop 9 KLT Tecno Pop 9 5G KL8H Tecno Spark 30C 5G X6531B X6720B X6532C Tecno Smart 9 HD KL4H Tecno Pop 9 4G Tecno Spark Go 1S",
  },
  {
    id: 32,
    code: "Infinix S4 X626 X627 Infinix Smart 3 Plus",
  },
  {
    id: 33,
    code: "X675 Infinix Hot 11 2022",
  },
  {
    id: 34,
    code: "Infinix X662 KH7H Tecno Spark 9 Pro KH7 KG7 KG7H KG6P Infinix Hot 11 Tecno Spark 8T Tecno Spark 8P X662",
  },
  {
    id: 35,
    code: "Tecno KC1 Tecno KC6 Tecno Spark Go Tecno Spark 4 Air",
  },
  {
    id: 36,
    code: "Infinix X6511E X6511D X6511",
  },
  {
    id: 37,
    code: "TECNO IN1 Infinix X5515",
  },
  {
    id: 38,
    code: "Tecno KB2 X5516 iACE2X",
  },
  {
    id: 39,
    code: "CG6 CG6J Camon 17 KF8 Spark 7 Pro",
  },
  {
    id: 40,
    code: "X687 CE9 Zero 8i",
  },
  {
    id: 41,
    code: "Infinix X695 Infinix Note 10 Pro",
  },
  {
    id: 42,
    code: "Tecno Camon 19 Pro 5G CI7 CI7N Tecno Camon 19 Pro CI8 CI8N Camon 19 CI6 CI6N",
  },
  {
    id: 43,
    code: "Tecno Camon 30 5G CL7 CL7K Infinix Note 40 5G Infinix X6852 Tecno Pova 6 LI7 Tecno Pova 6 Pro 5G LI9 Tecno Camon 30 CL6 CL6K",
  },
  {
    id: 44,
    code: "CH9 Camon 18 Premier",
  },
  {
    id: 45,
    code: "Infinix X6811 Infinix Zero X Infinix Zero X Pro X6811B",
  },
  {
    id: 46,
    code: "Infinix X622 X623 Infinix Hot S3X Infinix Hot 6X",
  },
  {
    id: 47,
    code: "Infinix X625C Infinix Hot 7 X625D Infinix Hot 7 Pro",
  },
  {
    id: 48,
    code: "KB3 KB8 iSky 3 Tecno Spark 3 Pro",
  },
  {
    id: 49,
    code: "ID3K ID5A ID5B CF7 CF8 Camon I2 Camon I2X Camon I Air 2 Plus",
  },
  {
    id: 50,
    code: "CG8 Infinix X6810 Tecno Camon 17 Pro Infinix Zero X Neo",
  },
  {
    id: 51,
    code: "Infinix X690 X690B Infinix Note 7",
  },
  {
    id: 52,
    code: "Infinix X666 X666B Infinix Hot 20 5G",
  },
  {
    id: 53,
    code: "Infinix X668 X668C BE8 BE8I KH6 Infinix Hot 12 Pro Pop 6 Pro",
  },
];

export default function ToolsPage() {
  const [search, setSearch] = useState("");

  const query = search.trim().toLowerCase();

  const results = tools.filter((tool) =>
    tool.code.toLowerCase().includes(query)
  );

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#05070f",
        color: "#fff",
        padding: "25px 15px 50px",
      }}
    >
      <div style={{ maxWidth: 900, margin: "auto" }}>
        <a
          href="/"
          style={{
            color: "#22d3ee",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          ← Back to Home
        </a>

        <div style={{ marginTop: 20 }}>
          <h1 style={{ marginBottom: 5 }}>
            🔧 Universal Tool Finder
          </h1>

          <p style={{ color: "#aeb5cc" }}>
            Search any mobile model or code.
          </p>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search e.g. X650, X688, KE5..."
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "16px",
              borderRadius: 12,
              border: "1px solid #6d28d9",
              background: "#070b18",
              color: "#fff",
              fontSize: 16,
              outline: "none",
              marginTop: 10,
            }}
          />

          <div
            style={{
              marginTop: 15,
              color: "#aeb5cc",
              fontSize: 14,
            }}
          >
            {query
              ? `${results.length} result(s) found`
              : `${tools.length} options available`}
          </div>
        </div>

        <div style={{ marginTop: 15 }}>
          {results.map((tool) => {
            const matched = query !== "";

            return (
              <article
                key={tool.id}
                style={{
                  padding: 18,
                  marginBottom: 10,
                  borderRadius: 12,
                  background: matched
                    ? "rgba(34,211,238,.12)"
                    : "#0b1020",
                  border: matched
                    ? "2px solid #22d3ee"
                    : "1px solid rgba(255,255,255,.1)",
                  boxShadow: matched
                    ? "0 0 20px rgba(34,211,238,.18)"
                    : "none",
                }}
              >
                <div
                  style={{
                    color: "#fbbf24",
                    fontWeight: 900,
                    marginBottom: 8,
                  }}
                >
                  #{tool.id}
                </div>

                <div
                  style={{
                    lineHeight: 1.7,
                    fontSize: 15,
                  }}
                >
                  {tool.code}
                </div>

                {matched && (
                  <div
                    style={{
                      marginTop: 10,
                      color: "#22d3ee",
                      fontWeight: 800,
                    }}
                  >
                    ✓ Match Found
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {query && results.length === 0 && (
          <div
            style={{
              marginTop: 20,
              padding: 25,
              textAlign: "center",
              borderRadius: 12,
              background: "#0b1020",
              color: "#aeb5cc",
            }}
          >
            No results found.
          </div>
        )}
      </div>
    </main>
  );
}