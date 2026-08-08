"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Tool = {
  id: number;
  code: string;
  note?: string;
};

type Category = {
  id: string;
  name: string;
  emoji: string;
  tools: Tool[];
};

const categories: Category[] = [
  {
    id: "infinix",
    name: "Infinix / Tecno / Itel",
    emoji: "📱",
    tools: [
      {
        id: 1,
        code: "Infinix X657 Infinix X657C Infinix X657B Itel Vision 1 Plus Itel Vision 1 Pro Itel Vision 2S Itel P36 Itel P37 Itel S16 Infinix Smart 5A Infinix Smart 5 Infinix Hot 10 Lite KF6 Tecno Spark 7",
      },
      {
        id: 2,
        code: "Infinix Smart HD Infinix Smart HD 2021 X612 X612B",
      },
      {
        id: 3,
        code: "Tecno KE5 Tecno KE5S Tecno KE5K Tecno Spark 6 GO Tecno Spark GO 2020 Spark GO 2021",
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
        code: "Itel A60 Itel A60S Infinix Smart 7 Tecno Spark 10 Tecno Pop 7 Pro Tecno Pop 7 Tecno Spark 10C Itel P40 Tecno Spark Go 2023 Tecno Spark 10 5G Infinix Smart 7 HD X6517 X669 BF6 X6516 X6515 KI5Q KI5N KI5K BF7 BF7H BF7N BF7S P662L KI8 X669C A70 P40 A50 A60 A60S S23 A05S KI5 KI8 P55 5G Smart 7 Smart 7 HD Hot 30i Spark GO 2023 Spark 10 Pop 7 ZTE A34 ZTE A54",
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
        code: "Itel Vision 3 S661L Tecno Spark 9 Itel S18 Itel Vision 5 Itel P38 KG5P KG5J KG5K KH6 KG5KS KG5Q",
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
        code: "Tecno KF6 Tecno SPARK 7T Tecno SPARK 7 Tecno KG6 Infinix X659 Infinix X658 KF6H KF6J KG6 Tecno Spark 8 KE5",
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
        code: "Infinix X693 Infinix NOTE 10 Tecno POVA 2 Tecno POVA 5G Tecno POVA 3 LE7 LE8 LF7 Infinix X698 Infinix X697 Infinix NOTE 11i Infinix NOTE 11S Infinix NOTE 11 PRO",
      },
      {
        id: 26,
        code: "X6831 X6711 X6838 X6837 X6832 X6836 Tecno Spark 20 Pro KJ6 Infinix Hot 40 Tecno Spark 10 Pro KI7 Infinix Hot 30 5G Infinix Note 30 5G Infinix Hot 40 Pro Pova 5 Pro 5G LH7N Tecno Spark 20 Pro 5G KJ8 Infinix Note 40X 5G",
        note: "Version Problem",
      },
      {
        id: 27,
        code: "Itel A06 Itel A50C Itel A669W Itel A669L",
      },
      {
        id: 29,
        code: "X668 X668C Infinix Hot 12 Infinix Hot 12 Pro Tecno Pop 6 Pro BE4 Infinix Pop 6 Pro BE8",
      },
      {
        id: 30,
        code: "Infinix Smart 4 Tecno Pop 3 Plus BB4K BB4 X653C X653",
      },
      {
        id: 32,
        code: "Infinix Hot 50 5G X6720 Infinix Hot 50i X6531 Infinix Smart 9 X6532 Tecno Spark Go 1 KL4 Tecno Spark 30 5G KL8 Itel P65 Itel P671L Tecno Spark 30C KL5N Itel A80 Itel A671LC Pova 6 Neo 5G Tecno Pop 9 KLT KL5N Tecno Pop 9 5G KL8H Tecno Spark 30C 5G X6531B X6720B X6532C Tecno Smart 9 HD KL4H Tecno Pop 9 4G Tecno Spark Go 1S",
      },
      {
        id: 34,
        code: "Infinix S4 X626 X627 Infinix Smart 3 Plus",
      },
      {
        id: 35,
        code: "X675 Infinix Hot 11 2022",
      },
      {
        id: 36,
        code: "Infinix X662 KH7H Tecno Spark 9 Pro KH7 KG7 KG7H KG6P Infinix Hot 11 Tecno Spark 8T Tecno Spark 8P",
      },
      {
        id: 37,
        code: "Tecno KC1 Tecno KC6 Tecno Spark Go Tecno Spark 4 Air",
      },
      {
        id: 38,
        code: "Itel Vision 1 Itel P36 Play",
      },
      {
        id: 39,
        code: "Infinix X6511E Infinix X6511D Infinix X6511",
      },
      {
        id: 40,
        code: "TECNO IN1 Infinix X5515",
      },
      {
        id: 41,
        code: "Tecno KB2 X5516 iACE2X",
      },
      {
        id: 42,
        code: "CG6 CG6J Camon 17 KF8 Spark 7 Pro",
      },
      {
        id: 43,
        code: "X687 CE9 Zero 8i",
      },
      {
        id: 44,
        code: "Infinix X695 Infinix Note 10 Pro",
      },
      {
        id: 45,
        code: "Tecno Camon 19 Pro 5G CI7 CI7N Tecno Camon 19 Pro CI8 CI8N Camon 19 CI6 CI6N",
      },
      {
        id: 46,
        code: "Tecno Camon 30 5G CL7 CL7K Infinix Note 40 5G Infinix X6852 Tecno Pova 6 LI7 Tecno Pova 6 Pro 5G LI9 Tecno Camon 30 CL6 CL6K",
      },
      {
        id: 47,
        code: "CH9 Camon 18 Premier",
      },
      {
        id: 48,
        code: "Infinix X6811 Infinix Zero X Infinix Zero X Pro Infinix X6811B",
      },
      {
        id: 49,
        code: "Infinix X622 Infinix X623 Infinix Hot S3X Infinix Hot 6X",
      },
      {
        id: 50,
        code: "Infinix X625C Infinix Hot 7 Infinix X625D Infinix Hot 7 Pro",
      },
      {
        id: 51,
        code: "KB3 KB8 iSky 3 Tecno Spark 3 Pro",
      },
      {
        id: 52,
        code: "ID3K ID5A ID5B CF7 CF8 Camon I2 Camon I2X Camon I Air 2 Plus",
      },
      {
        id: 53,
        code: "CG8 Infinix X6810 Tecno Camon 17 Pro Infinix Zero X Neo",
      },
      {
        id: 54,
        code: "Infinix X690 Infinix X690B Infinix Note 7",
      },
      {
        id: 55,
        code: "Infinix X666 Infinix X666B Infinix Hot 20 5G",
      },
      {
        id: 56,
        code: "Infinix X668 Infinix X668C BE8 BE8I KH6 Infinix Hot 12 Pro Pop 6 Pro",
      },
    ],
  },

  {
    id: "vivo",
    name: "Vivo / iQOO",
    emoji: "📱",
    tools: [
      { id: 1, code: "Vivo Y11 Vivo Y12 Vivo Y15 Vivo Y17 Vivo U10 Vivo Y3" },
      { id: 2, code: "Vivo T3x 5G Vivo Y200i 5G Vivo Y58 5G iQOO Z9x" },
      { id: 3, code: "Vivo Y20 Vivo Y20g Vivo Y12g Vivo Y01" },
      { id: 4, code: "Vivo Y19 Vivo U20 Vivo Y5s Vivo U3x iQOO Z5i" },
      { id: 5, code: "Vivo Y03 Vivo Y18 Vivo T3 Lite 5G Vivo Y28s 5G Vivo Y18e Vivo Y18i Vivo Y18s Vivo Z9 Lite 5G Vivo Y28e 5G Vivo Y03t" },
      { id: 6, code: "Vivo Y22 Vivo Y17s Vivo Y22s Vivo Y22 New Vivo Y28 5G Vivo Y33t Vivo Y36i Vivo Y36 Vivo Y12 New" },
      { id: 7, code: "Vivo Y91 Vivo Y91i Vivo Y90 Vivo Y91c Vivo Y93 Vivo Y95 Vivo Y1s" },
      { id: 8, code: "Vivo Y79 Vivo Y7 Plus Vivo Y79a" },
      { id: 9, code: "Vivo Y02 Vivo Y02t Vivo Y02 New Vivo Y02a" },
      { id: 10, code: "Vivo Y71 Vivo Y71i Vivo V7" },
      { id: 11, code: "Vivo S1 Vivo S1 Pro Vivo Z1x Vivo Y7s" },
      { id: 12, code: "Vivo V17 Vivo V19 Neo" },
      { id: 13, code: "Vivo Z1 Pro Vivo Z5x" },
      { id: 14, code: "Vivo V28 Vivo Y73 Vivo V23e 5G Vivo Y75 4G" },
      { id: 15, code: "Vivo V20 Vivo V21e 4G Vivo V21e 5G Vivo V20 2021 Vivo V21 4G Vivo V23e Vivo Y73 4G Vivo S6 Vivo Y75 4G iQOO Z6 4G" },
      { id: 16, code: "Vivo V20 Vivo V23e Vivo Y75 Vivo V21e Vivo Y70 Vivo X50 Lite Vivo Y55 Vivo Y51 OLED", note: "OLED ONLY" },
      { id: 17, code: "Vivo T1 Pro Vivo V25e 5G Vivo V25 5G Vivo V21 5G Vivo S15e Vivo S9e" },
      { id: 18, code: "Vivo V11 Vivo V11i Vivo Z3i Vivo Y97 Vivo Z3" },
      { id: 19, code: "Vivo Y81 Vivo Y81i Vivo Y83 Vivo Y83 Pro Vivo Y81s" },
      { id: 20, code: "Vivo V9 Vivo V9 Youth Vivo V9 Pro Vivo Y85" },
      { id: 21, code: "Vivo Y21 Vivo Y21s Vivo Y21a Vivo Y21e Vivo Y21t Vivo Y21g Vivo Y02s Vivo Y16 Vivo Y30 5G Vivo Y15a Vivo Y15c Vivo Y32 Vivo Y33 5G" },
      { id: 22, code: "Vivo Y51 2020 Vivo Y31 2020 Vivo Y73 Vivo Y72s Vivo Y53s iQOO Z3 iQOO U3 iQOO U3x Vivo Y33s Vivo Y31 Vivo Y15a Vivo T2x Vivo Y72 5G Vivo Y55s 5G Vivo Y76 5G Vivo Y76s 5G Vivo Y75 5G Vivo Y77 5G Vivo Y56 5G" },
      { id: 23, code: "Vivo Y20 Vivo Y20a Vivo Y20t Vivo Y20s Vivo Y20i Vivo Y20g Vivo Y12g Vivo Y20sg Vivo Y12s Vivo Y12a Vivo Y20e Vivo Y30g Vivo Y31s 5G Vivo Y15a Vivo Y11s Vivo Y12d Vivo Y15s Vivo Y01 iQOO U1x" },
      { id: 24, code: "Vivo T2x 5G Vivo Y56 New Vivo Y55s Vivo Y77 5G Vivo Y72 5G Vivo Y72t Vivo Y56 5G Vivo Y75 5G Vivo T1 5G iQOO Z6 5G iQOO Z6 Lite 5G" },
      { id: 25, code: "Vivo Y27 4G Vivo Y36 4G" },
      { id: 26, code: "Vivo Y35 Vivo Y35 New" },
      { id: 27, code: "Vivo V21e 5G Vivo S10e Vivo S6 Vivo S7e Vivo Y73s Vivo Y71t Vivo Y55 4G Vivo X50 Vivo G1" },
      { id: 28, code: "Vivo Y03 Vivo Y18" },
      { id: 29, code: "Vivo Y28 4G Vivo Y38 5G Vivo Y19s" },
      { id: 30, code: "Vivo V27 5G Vivo S16 Vivo Y78 Plus Vivo V29e Vivo V29 Lite 5G Vivo Y200 Pro Vivo T2 Pro 5G Vivo V27 Pro 5G Vivo V29 SE 5G Vivo Y78 5G Vivo V30e 5G Vivo Y300 Plus 5G iQOO Z7 Pro Vivo S16 Pro Vivo S17e" },
      { id: 31, code: "Vivo Y30 4G Vivo Y50", note: "Only Crown" },
      { id: 32, code: "Vivo V5 Vivo Y67" },
      { id: 33, code: "Vivo Y78T Vivo Y78 Vivo Z8 Vivo Z8x Vivo Y100i iQOO Z7x Vivo Y36 5G Vivo Y36" },
      { id: 34, code: "Vivo V15 Pro Vivo X27" },
      { id: 35, code: "Vivo V11 Pro Vivo X23" },
      { id: 36, code: "Vivo V20 Pro Vivo S7 Vivo S7t" },
      { id: 37, code: "Vivo V23 5G Vivo S9 Vivo S10 Vivo S10 Pro Vivo S12 Pro" },
      { id: 38, code: "Vivo X60 Vivo X70 Vivo V2045" },
      { id: 39, code: "Vivo iQOO 007 Vivo iQOO Neo 5s Vivo iQOO Neo 5 Vivo S15" },
      { id: 40, code: "Vivo Y100 Vivo Y100A Vivo Y100 T2 5G iQOO Z7 5G" },
      { id: 41, code: "Vivo Y200 5G Vivo Y200e 5G Vivo Y100 Vivo T3 5G Vivo V29e" },
      { id: 42, code: "Vivo Y52s Vivo Y75 5G Vivo Y72 iQOO Z3 Vivo Y51 Vivo Y53s" },
      { id: 43, code: "Vivo T4x 5G iQOO Z10x 5G Vivo T3x 5G Vivo Y58 5G iQOO 29x Vivo Y200i 5G" },
      { id: 44, code: "Vivo V40e Vivo T3 Pro iQOO Z9s iQOO Z9s Pro" },
    ],
  },

  {
    id: "oppo",
    name: "Oppo / Realme / OnePlus",
    emoji: "📱",
    tools: [
      { id: 1, code: "Realme 6 Realme 6i Realme 7 Realme 6s Realme Narzo 20 Pro Realme Narzo 30" },
      { id: 2, code: "Realme XT Realme K5 Realme K1 Oppo Reno Z Oppo R15x Realme X2 Oppo K1" },
      { id: 3, code: "Realme C2 Oppo A1k" },
      { id: 4, code: "Oppo A3s Oppo A5 Realme 2 Realme C1 Oppo AX5 Oppo A12e" },
      { id: 5, code: "Oppo F1s Oppo A59", note: "Old" },
      { id: 6, code: "Oppo A18 Oppo A38 Oppo A59 5G Oppo A57 5G Oppo A57s Oppo A57a Oppo A77 Oppo A77s Oppo K10 5G Oppo A17 Oppo A17k Oppo A57 2020 Oppo A58 5G Oppo A78 5G OnePlus Nord N20SE Oppo A58x 5G Oppo A56s 5G Oppo A57e Oppo A2x 5G Oppo A3b Oppo A1x 5G Oppo A2m 5G OnePlus Nord N300 5G Oppo A77 5G" },
      { id: 7, code: "Realme 2 Pro Realme U1 Oppo F9 Oppo F9 Pro" },
      { id: 8, code: "Oppo A53 Oppo A53s Oppo A53 2020 Oppo A54 4G Oppo A55 4G Oppo A11s Realme Narzo 20 Realme 7i Oppo A33 Oppo A54 Oppo A32 Realme C17 OnePlus Nord N100", note: "Tray Oppo A55" },
      { id: 9, code: "Realme Narzo N53 Realme C53 Realme C51 Realme Note 50" },
      { id: 10, code: "Realme C30 Realme C30s Realme C33 Realme Narzo 50i Prime Realme C30F" },
      { id: 11, code: "Realme C25 Realme C25s Realme Narzo 50A Oppo A16 Oppo A16s Oppo A54s Oppo A54 Oppo A53s 5G Oppo A55 5G Oppo A56 5G", note: "Try C11 only – Crown" },
      { id: 12, code: "Realme C11 Realme C12 Realme C15 Realme Narzo 20 Realme Narzo 30A Oppo A15 Oppo A15s Oppo A16e Oppo A16k Realme Q2i 5G", note: "Try A16 only – Crown" },
      { id: 13, code: "Realme C20 Realme C11 2021 Realme Narzo 50i Realme C21" },
      { id: 14, code: "Realme Narzo 10A Realme Narzo 20A Realme C3", note: "Tray C3 – Crown" },
      { id: 15, code: "Oppo A5s Oppo A7 Oppo A12 Oppo A11k Realme 3 Realme 3i Oppo A21 A20 A22 A24 CPH2083 CPH1901 RMX1825 RMX1827" },
      { id: 16, code: "Realme C55 Realme 11x 5G Oppo F23 5G Oppo A58 4G Realme N55 Oppo A98 5G OnePlus Nord CE3 Lite 5G Realme 11 5G Realme C67 5G Oppo K11x Oppo A1 5G Realme Narzo 60x 5G Oppo A79 5G" },
      { id: 17, code: "Realme 8i Realme 9i Oppo A96 Realme Narzo 50 Oppo K10" },
      { id: 18, code: "Oppo A52 Oppo A72 Oppo A92 Oppo A52 2020 Oppo A92 2020 Oppo A72 2020" },
      { id: 19, code: "Realme C35 Realme Narzo 50A Prime" },
      { id: 20, code: "Realme C21Y Realme C25Y", note: "Single Pata" },
      { id: 21, code: "Realme C3 Oppo A5 2020 Oppo A9 2020 Oppo A31 2020 Realme 5 Realme 5s Realme 5i Realme 10A Realme 20A" },
      { id: 22, code: "Oppo K3 Oppo Reno 2Z Oppo Reno 2F Realme X" },
      { id: 23, code: "Oppo A54 5G Oppo A74 5G Oppo A93 5G Realme Q3 OnePlus Nord N200" },
      { id: 24, code: "Realme 8 5G Realme 8s 5G Realme Narzo 30 5G Oppo A93 Realme Q3i Oppo A93s 5G Realme V13 5G Oppo K9x Realme 9 5G RMX3381 RMX3388 RMX3241" },
      { id: 25, code: "Oppo F19 Oppo F19 Pro Oppo F19s Oppo A95 4G Oppo A95 5G Oppo A94 5G Oppo A96 5G Oppo Reno 5Z Oppo Reno 7Z Oppo Reno 6Z Oppo Reno 8Z Oppo Reno 5F Oppo Reno 5 Lite Oppo Reno 6 Lite Oppo Reno 7 Lite Oppo Reno 8 Lite Oppo A94 4G Oppo A74 4G Realme X7 Realme X7 5G Realme 7 Pro Realme Q2 5G Realme V15 Oppo Reno 4 SE 5G Realme 8 Realme 8 Pro Oppo F21 Pro 5G CPH2219 CPH2223 CPH2285 CPH2211 CPH2237 CPH2343 CPH2203 RMX3092 RMX2170 RMX2176 RMX2173 RMX3085 RMX3082 CPH2341" },
      { id: 26, code: "Oppo F15 Oppo F17 Oppo A73 Oppo Reno 3 Oppo A91 Oppo K7 Oppo Reno 3 SE Find X2 Lite" },
      { id: 27, code: "Oppo A18 Oppo A57 New" },
      { id: 28, code: "Realme 9i 5G Realme 10 5G Realme 10s" },
      { id: 29, code: "Realme V25 Oppo K9s Realme Q5 OnePlus Nord CE2 Lite Realme 9 Pro 5G" },
      { id: 30, code: "Realme 12x 5G Realme C63 5G" },
      { id: 31, code: "OnePlus 10R 5G OnePlus 10T 5G Oppo Reno 8 Pro 5G OnePlus Ace Realme GT Neo 3" },
      { id: 32, code: "Realme 9 Pro 5G Realme 9 Pro OnePlus Nord CE2 Lite 5G RMX3471 CPH2381" },
      { id: 33, code: "Oppo Reno 7 4G Realme 11 4G Oppo Reno 7 5G Oppo Reno 8 4G Oppo Reno 8 5G Realme 9 4G Realme 9 Pro Plus 5G Realme 10 4G Oppo F21 Pro 4G Oppo F21s Pro 5G Oppo Find X5 Lite 5G OnePlus Nord CE2 5G Oppo A78 4G Oppo Reno 8T Realme Narzo 7 SE 5G Realme Narzo 50 Pro 5G" },
      { id: 34, code: "Oppo A60 Oppo A80 Realme C65 Realme Narzo N65 Oppo A3 Oppo A3X Oppo A3 Pro 5G Oppo K12X 5G" },
      { id: 35, code: "Oppo Reno 8 Pro 5G OnePlus 10R 5G OnePlus 10T 5G OnePlus Ace Realme GT Neo 3" },
      { id: 36, code: "Realme X SuperZoom Realme X50 5G Realme X3" },
      { id: 37, code: "Oppo A9 Oppo F11 Oppo A9X" },
      { id: 38, code: "Realme C63 4G Realme C61 Realme Narzo N63" },
      { id: 39, code: "OnePlus 9R OnePlus 8T" },
      { id: 40, code: "Realme 1 Oppo F5 Youth" },
      { id: 42, code: "OnePlus 4 Lite Oppo Reno 12F 4G Oppo Reno 12F 5G Realme Narzo 70 Pro Oppo F27 Oppo Reno 12FS 4G Oppo Reno 12FS 5G Realme 12 Plus Realme Narzo 70 Realme P1 5G Realme 12 Plus 5G Realme Narzo 70 5G Oppo Reno 12F Realme P3 5G Oppo Reno 12FS Oppo Reno 13F Realme 13 Plus 5G Oppo F27 5G Realme 13 4G Realme 12 4G Realme Narzo 70 Turbo Realme P1 Speed 5G Realme 14 5G OnePlus Nord CE 4 Lite Realme Neo 7X Oppo K12X" },
      { id: 43, code: "Oppo Reno 5 4G Oppo Reno 5 5G Oppo Reno 6 5G Oppo Reno 6 4G OnePlus Nord 2 5G OnePlus Nord CE 5G OnePlus Nord 2T 5G Realme GT Master Edition Realme X7 Max 5G Realme GT Neo 2T Realme GT Neo Fast Realme Q3 Pro Realme GT Realme GT Neo Oppo Find X3 Lite 5G" },
      { id: 44, code: "Realme 10 Pro Plus 5G Realme 11 Pro 5G Realme 11 Pro Plus 5G Realme 12 Pro 5G Realme 12 Pro Plus 5G Realme P1 Pro 5G Oppo F27 Pro Plus 5G Oppo Reno 11 5G Oppo Reno 10 5G Oppo Reno 10 Pro 5G Oppo Reno 11 Pro 5G Oppo Reno 8T 5G Realme Narzo 60 Pro 5G Oppo Reno 9 5G Oppo Reno 9 Pro 5G Oppo A1 Pro 5G" },
      { id: 45, code: "Oppo K12 OnePlus Ace 4 OnePlus Nord CE 3 OnePlus Nord CE 4 Oppo K11 Oppo Reno 11F Oppo F25 Pro 5G" },
      { id: 46, code: "Oppo A76 Oppo A36" },
      { id: 47, code: "Oppo Reno 5 OnePlus Nord 2" },
      { id: 48, code: "Realme 13 Pro Plus 5G OnePlus Nord CE4 Lite Realme 12 4G" },
      { id: 49, code: "Oppo K12X OnePlus Nord CE4 Lite 5G Oppo F27 5G Oppo Reno 12F Oppo Reno 12FS Oppo Reno 12FS 5G Oppo Reno 12F 5G Realme 12 Realme 13+ 5G Narzo 70 Turbo Realme 13 Pro Realme 13 4G Oppo Reno 13F Oppo Reno 13F 5G" },
      { id: 50, code: "Realme P3X Realme 14X Realme C75 4G Realme C75 5G Realme C75X" },
    ],
  },

  {
    id: "samsung",
    name: "Samsung",
    emoji: "📱",
    tools: [
      { id: 1, code: "Samsung F22 Samsung A22 4G Samsung M22" },
      { id: 2, code: "Samsung A12 Samsung M12 Samsung F12 Samsung A02 Samsung M02 Samsung A32 5G Samsung M23 5G Samsung A125 Samsung M127 Samsung A022 Samsung M022 Samsung A326 Samsung M326" },
      { id: 3, code: "Samsung M11 Samsung A11" },
      { id: 4, code: "Samsung A04s Samsung A23 Samsung A13 5G Samsung A136 Samsung A047 Samsung A047F" },
      { id: 5, code: "Samsung A04e Samsung A02s Samsung A03s Samsung M02s Samsung A03 Samsung A04 Samsung F04 Samsung F02s" },
      { id: 6, code: "Samsung J6 Plus Samsung J4 Plus" },
      { id: 7, code: "Samsung A10 Samsung M10 Samsung A10s" },
      { id: 8, code: "Samsung A30 Samsung A50 Samsung A30s Samsung A50s" },
      { id: 9, code: "Samsung A15 Samsung A15 5G Samsung F15 Samsung M15" },
      { id: 10, code: "Samsung M21 Samsung M21s Samsung M30 Samsung M30s Samsung M31 Samsung F41 Samsung M31s Samsung M305 Samsung M315 Samsung M307 Samsung F415" },
      { id: 11, code: "Samsung F62 Samsung M62 Samsung A71 4G Samsung A71 5G Samsung M51" },
      { id: 12, code: "Samsung A70 Samsung A70s Samsung A707 Samsung A705" },
      { id: 13, code: "Samsung A20 Samsung A20s" },
      { id: 14, code: "Samsung A60 Samsung M40" },
      { id: 15, code: "Samsung A01 Core Samsung M01 Core Samsung A013 Samsung M013" },
      { id: 16, code: "Samsung A24 Samsung A25 Samsung F34 Samsung M34" },
      { id: 17, code: "Samsung A32 4G Samsung M32 4G" },
      { id: 18, code: "Samsung M01 Samsung A01 Samsung M015 Samsung A015" },
      { id: 19, code: "Samsung A05s Samsung M14 4G Samsung A057" },
      { id: 20, code: "Samsung A13 Samsung A13 4G Samsung A13 Lite Samsung F13 Samsung M13 Samsung A135 Samsung A137" },
      { id: 21, code: "Samsung A14 4G Samsung A14 5G Samsung A146 Samsung A146B Samsung A145F" },
      { id: 22, code: "Samsung M14 5G Samsung F14 5G Samsung M146B Samsung E146B" },
      { id: 23, code: "Samsung A15 5G Samsung A15 4G Samsung F15 5G Samsung M15 5G" },
      { id: 24, code: "Samsung A16 5G Samsung A16 4G Samsung A26 5G Samsung A166P" },
      { id: 25, code: "Samsung A22 5G Samsung F42 5G Samsung A22s 5G" },
      { id: 26, code: "Samsung A23 4G Samsung A23 5G Samsung F23 5G Samsung M23 5G Samsung M33 5G" },
      { id: 27, code: "Samsung A24 Samsung A25 5G Samsung M34 5G" },
      { id: 28, code: "Samsung A32 4G Samsung M32 4G" },
      { id: 29, code: "Samsung A51 Samsung A51 5G Samsung M31s" },
      { id: 30, code: "Samsung A52 5G Samsung A52 4G Samsung A52s 4G" },
      { id: 31, code: "Samsung A53 5G Samsung A53 4G" },
      { id: 32, code: "Samsung A55 5G Samsung A35 5G Samsung M35 5G" },
      { id: 33, code: "Samsung M52 5G Samsung M53 5G Samsung M54 5G Samsung F54 5G Samsung M52 Samsung M54 Samsung M53" },
      { id: 34, code: "Samsung M55 5G Samsung F55 5G Samsung C55 5G Samsung M55s 5G" },
      { id: 35, code: "Samsung S20 FE 4G Samsung S20 FE 5G" },
      { id: 36, code: "Samsung A06 5G Samsung F06 5G Samsung M06 5G Samsung A066B Samsung E066B Samsung M066B" },
    ],
  },
];

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function containsMatch(code: string, query: string) {
  const q = normalize(query);
  if (!q) return false;

  const words = code.split(/\s+/);

  return (
    normalize(code).includes(q) ||
    words.some((word) => normalize(word).includes(q))
  );
}

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("infinix");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const category =
    categories.find((item) => item.id === activeCategory) ?? categories[0];

  const results = useMemo(() => {
    if (!query.trim()) return category.tools;

    return category.tools.filter((tool) =>
      containsMatch(tool.code, query)
    );
  }, [category, query]);

  useEffect(() => {
    if (!query.trim()) {
      setSelectedId(null);
      return;
    }

    if (results.length > 0) {
      const first = results[0];
      setSelectedId(first.id);

      setTimeout(() => {
        document
          .getElementById(`tool-${category.id}-${first.id}`)
          ?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
      }, 80);
    } else {
      setSelectedId(null);
    }
  }, [query, category.id, results]);

  return (
    <main>
      <div
        style={{
          background: "#05070f",
          borderBottom: "1px solid #6b4b00",
          textAlign: "center",
          padding: "9px",
          color: "#fbbf24",
          fontWeight: 800,
        }}
      >
        إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ
      </div>

      <header
        style={{
          borderBottom: "1px solid rgba(255,255,255,.12)",
          background: "rgba(3,7,18,.96)",
        }}
      >
        <div
          className="container"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 25,
            padding: "15px 0",
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 25, lineHeight: 1.05 }}>
            <span style={{ color: "#fff" }}>NEW </span>
            <span style={{ color: "#22d3ee" }}>ARIF</span>
            <br />
            <span style={{ fontSize: 17 }}>MOBILE CENTER</span>
            <small
              style={{
                display: "block",
                color: "#aeb5cc",
                fontSize: 10,
              }}
            >
              Better Parts • Better Repairs • A Better You
            </small>
          </div>

          <nav
            className="navlinks"
            style={{
              display: "flex",
              gap: 22,
              marginLeft: "auto",
              fontWeight: 700,
            }}
          >
            {["⌂ Home", "🔧 Tools", "📦 Parts", "⚙ Repairing", "ⓘ About Us", "☎ Contact"].map(
              (x) => (
                <a key={x} href="#">
                  {x}
                </a>
              )
            )}
          </nav>

          <a
            className="btn"
            style={{
              background: "linear-gradient(135deg,#16a34a,#059669)",
            }}
            href="https://wa.me/923290882200"
          >
            WhatsApp
          </a>
        </div>
      </header>

      <section className="container" style={{ padding: "30px 0" }}>
        <div
          className="glass hero"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.2fr",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "38px" }}>
            <div
              style={{
                color: "#ff38dc",
                fontWeight: 900,
                letterSpacing: 1,
              }}
            >
              MOBILE PARTS & REPAIRING SOLUTIONS
            </div>

            <h1
              style={{
                fontSize: "clamp(44px,7vw,82px)",
                lineHeight: 0.9,
                margin: "12px 0",
                fontWeight: 950,
              }}
            >
              NEW <span style={{ color: "#ffd21f" }}>ARIF</span>
            </h1>

            <h2 style={{ fontSize: 32, margin: "0 0 20px" }}>
              MOBILE CENTER
            </h2>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <span className="badge">🛡 Quality Parts</span>
              <span className="badge">🔧 Expert Repairing</span>
              <span className="badge">👍 Trusted Service</span>
              <span className="badge">⚡ Fast Service</span>
            </div>

            <div
              style={{
                marginTop: 20,
                padding: 15,
                border: "1px solid rgba(130,80,255,.5)",
                borderRadius: 12,
              }}
            >
              📍 <b>Al Saif Plaza, Kamar Mushani, Mianwali</b>
              <br />
              <span style={{ color: "#aeb5cc" }}>
                Visit Our Shop for Best Quality & Best Prices
              </span>
            </div>
          </div>

          <div
            style={{
              minHeight: 360,
              background:
                "radial-gradient(circle at 50% 50%,rgba(119,0,255,.45),transparent 35%),linear-gradient(135deg,#11152b,#02050c)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ textAlign: "center", fontSize: 80 }}>
              🔬📱
            </div>
          </div>
        </div>

        <section
          id="universal-tools"
          className="glass"
          style={{ marginTop: 14, padding: 22 }}
        >
          <h2>🔎 UNIVERSAL TOOL FINDER</h2>

          <p style={{ color: "#aeb5cc" }}>
            Search your mobile model. Matching option will automatically
            highlight and scroll into view.
          </p>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search model e.g. X650"
              style={{
                flex: 1,
                minWidth: 220,
                padding: 14,
                borderRadius: 10,
                border: "1px solid #6d28ff",
                background: "#070b18",
                color: "#fff",
                fontSize: 16,
              }}
            />

            <button
              className="btn"
              onClick={() => setQuery(query.trim())}
            >
              Search
            </button>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginTop: 15,
            }}
          >
            {categories.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveCategory(item.id);
                  setQuery("");
                  setSelectedId(null);
                }}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,.15)",
                  background:
                    activeCategory === item.id
                      ? "linear-gradient(135deg,#7c3aed,#2563eb)"
                      : "#11182d",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 800,
                }}
              >
                {item.emoji} {item.name}
              </button>
            ))}
          </div>

          <div
            style={{
              marginTop: 15,
              color: results.length ? "#86efac" : "#fca5a5",
              fontWeight: 700,
            }}
          >
            {query
              ? `${results.length} result${results.length === 1 ? "" : "s"} found`
              : `${category.tools.length} options`}
          </div>

          <div style={{ marginTop: 15 }}>
            {category.tools.map((tool) => {
              const matched =
                query.trim() && containsMatch(tool.code, query);

              return (
                <article
                  id={`tool-${category.id}-${tool.id}`}
                  key={`${category.id}-${tool.id}`}
                  style={{
                    padding: 16,
                    marginBottom: 10,
                    borderRadius: 12,
                    border: matched
                      ? "2px solid #facc15"
                      : "1px solid rgba(255,255,255,.10)",
                    background: matched
                      ? "linear-gradient(135deg,rgba(250,204,21,.20),rgba(124,58,237,.18))"
                      : "#11182d",
                    boxShadow:
                      selectedId === tool.id
                        ? "0 0 25px rgba(250,204,21,.25)"
                        : "none",
                    transition: "all .25s ease",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                    }}
                  >
                    <strong
                      style={{
                        minWidth: 38,
                        color: matched ? "#facc15" : "#22d3ee",
                        fontSize: 18,
                      }}
                    >
                      {tool.id}.
                    </strong>

                    <div style={{ lineHeight: 1.7 }}>
                      <div style={{ fontWeight: 800 }}>{tool.code}</div>

                      {tool.note && (
                        <div
                          style={{
                            marginTop: 7,
                            color: "#fbbf24",
                            fontWeight: 800,
                          }}
                        >
                          ⚠️ {tool.note}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section
          className="glass"
          style={{ marginTop: 14, padding: 20 }}
        >
          <h2>📦 MOBILE PARTS & PRODUCTS</h2>

          <div className="grid-products">
            {[
              ["📱", "iPhone X Display", "Premium Quality", "Rs. 8,500"],
              ["🔋", "Samsung Battery A12", "Original", "Rs. 2,500"],
              ["🔌", "Type-C Charging Port", "Universal", "Rs. 350"],
              ["📷", "Back Camera", "HD Quality", "Rs. 850"],
              ["📱", "Oppo A54 Display", "Original", "Rs. 2,800"],
              ["🔋", "iPhone Battery", "Original", "Rs. 1,450"],
            ].map(([icon, name, desc, price]) => (
              <article className="product" key={name}>
                <div className="pic" style={{ fontSize: 50 }}>
                  {icon}
                </div>

                <div className="info">
                  <b>{name}</b>

                  <div
                    style={{
                      color: "#aeb5cc",
                      fontSize: 12,
                      margin: "5px 0",
                    }}
                  >
                    {desc}
                  </div>

                  <strong style={{ color: "#ffd21f" }}>
                    {price}
                  </strong>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>

      <footer
        style={{
          borderTop: "1px solid rgba(255,255,255,.12)",
          padding: "22px 0",
          background: "#03050c",
        }}
      >
        <div
          className="container"
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 15,
            flexWrap: "wrap",
            color: "#aeb5cc",
          }}
        >
          <span>📍 Al Saif Plaza, Kamar Mushani, Mianwali</span>
          <span>💬 0329 0882200</span>
          <span>🎵 @newarifmobilecenter</span>
          <span>© 2026 New Arif Mobile Center</span>
        </div>
      </footer>
    </main>
  );
}