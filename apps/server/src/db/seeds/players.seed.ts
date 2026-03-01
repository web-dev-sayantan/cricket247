import { db } from "@/db";
import { players, playerVerification } from "@/db/schema";

interface PlayerSeed {
  age: number;
  battingStance: string;
  bowlingStance?: string;
  dob: Date;
  id: number;
  isWicketKeeper?: boolean;
  name: string;
  nationality: string;
  role: string;
  sex: string;
}

const PLAYER_SEEDS: PlayerSeed[] = [
  {
    id: 93_101,
    name: "Arjun Mehta",
    age: 24,
    dob: new Date("2001-02-14T00:00:00.000Z"),
    sex: "male",
    nationality: "India",
    role: "Batter",
    battingStance: "Right handed",
  },
  {
    id: 93_102,
    name: "Nikhil Rao",
    age: 26,
    dob: new Date("1999-07-22T00:00:00.000Z"),
    sex: "male",
    nationality: "India",
    role: "Bowler",
    battingStance: "Left handed",
    bowlingStance: "Right arm fast",
  },
  {
    id: 93_103,
    name: "Raghav Menon",
    age: 23,
    dob: new Date("2002-04-08T00:00:00.000Z"),
    sex: "male",
    nationality: "India",
    role: "All-Rounder",
    battingStance: "Right handed",
    bowlingStance: "Right arm medium",
  },
  {
    id: 93_104,
    name: "Karan Khanna",
    age: 25,
    dob: new Date("2000-01-05T00:00:00.000Z"),
    sex: "male",
    nationality: "India",
    role: "Wicketkeeper",
    battingStance: "Right handed",
    isWicketKeeper: true,
  },
  {
    id: 93_105,
    name: "Pranav Iyer",
    age: 22,
    dob: new Date("2003-05-19T00:00:00.000Z"),
    sex: "male",
    nationality: "India",
    role: "Batter",
    battingStance: "Left handed",
  },
  {
    id: 93_106,
    name: "Dev Sharma",
    age: 27,
    dob: new Date("1998-10-30T00:00:00.000Z"),
    sex: "male",
    nationality: "India",
    role: "Bowler",
    battingStance: "Right handed",
    bowlingStance: "Left arm orthodox",
  },
  {
    id: 93_107,
    name: "Samarjeet Gill",
    age: 24,
    dob: new Date("2001-09-11T00:00:00.000Z"),
    sex: "male",
    nationality: "India",
    role: "All-Rounder",
    battingStance: "Right handed",
    bowlingStance: "Right arm offbreak",
  },
  {
    id: 93_108,
    name: "Vikram Das",
    age: 25,
    dob: new Date("2000-03-27T00:00:00.000Z"),
    sex: "male",
    nationality: "India",
    role: "Bowler",
    battingStance: "Right handed",
    bowlingStance: "Right arm fast",
  },
  {
    id: 93_109,
    name: "Aarav Nair",
    age: 23,
    dob: new Date("2002-11-03T00:00:00.000Z"),
    sex: "male",
    nationality: "India",
    role: "Batter",
    battingStance: "Left handed",
  },
  {
    id: 93_110,
    name: "Ritvik Sethi",
    age: 26,
    dob: new Date("1999-06-17T00:00:00.000Z"),
    sex: "male",
    nationality: "India",
    role: "All-Rounder",
    battingStance: "Right handed",
    bowlingStance: "Left arm pace",
  },
  {
    id: 93_111,
    name: "Hriday Chawla",
    age: 24,
    dob: new Date("2001-12-09T00:00:00.000Z"),
    sex: "male",
    nationality: "India",
    role: "Bowler",
    battingStance: "Right handed",
    bowlingStance: "Legbreak",
  },
  {
    id: 93_112,
    name: "Yash Tandon",
    age: 22,
    dob: new Date("2003-08-26T00:00:00.000Z"),
    sex: "male",
    nationality: "India",
    role: "Wicketkeeper",
    battingStance: "Left handed",
    isWicketKeeper: true,
  },
  {
    id: 93_113,
    name: "Neeraj Puri",
    age: 24,
    dob: new Date("2001-01-16T00:00:00.000Z"),
    sex: "male",
    nationality: "India",
    role: "Batter",
    battingStance: "Right handed",
  },
  {
    id: 93_114,
    name: "Aditya Kulkarni",
    age: 25,
    dob: new Date("2000-07-12T00:00:00.000Z"),
    sex: "male",
    nationality: "India",
    role: "Bowler",
    battingStance: "Right handed",
    bowlingStance: "Right arm medium",
  },
  {
    id: 93_115,
    name: "Lakshya Bansal",
    age: 23,
    dob: new Date("2002-02-03T00:00:00.000Z"),
    sex: "male",
    nationality: "India",
    role: "All-Rounder",
    battingStance: "Left handed",
    bowlingStance: "Right arm offbreak",
  },
  {
    id: 93_116,
    name: "Arnav Joshi",
    age: 26,
    dob: new Date("1999-09-02T00:00:00.000Z"),
    sex: "male",
    nationality: "India",
    role: "Batter",
    battingStance: "Right handed",
  },
  {
    id: 93_117,
    name: "Mihir Kapoor",
    age: 24,
    dob: new Date("2001-05-05T00:00:00.000Z"),
    sex: "male",
    nationality: "India",
    role: "Bowler",
    battingStance: "Right handed",
    bowlingStance: "Left arm orthodox",
  },
  {
    id: 93_118,
    name: "Siddhant Arora",
    age: 22,
    dob: new Date("2003-03-29T00:00:00.000Z"),
    sex: "male",
    nationality: "India",
    role: "All-Rounder",
    battingStance: "Right handed",
    bowlingStance: "Right arm fast",
  },
  {
    id: 93_119,
    name: "Tushar Walia",
    age: 23,
    dob: new Date("2002-10-13T00:00:00.000Z"),
    sex: "male",
    nationality: "India",
    role: "Batter",
    battingStance: "Left handed",
  },
  {
    id: 93_120,
    name: "Ishan Pratap",
    age: 25,
    dob: new Date("2000-04-21T00:00:00.000Z"),
    sex: "male",
    nationality: "India",
    role: "Bowler",
    battingStance: "Right handed",
    bowlingStance: "Right arm fast",
  },
  {
    id: 93_121,
    name: "Rudra Naidu",
    age: 24,
    dob: new Date("2001-06-30T00:00:00.000Z"),
    sex: "male",
    nationality: "India",
    role: "All-Rounder",
    battingStance: "Right handed",
    bowlingStance: "Left arm pace",
  },
  {
    id: 93_122,
    name: "Manan Ghosh",
    age: 23,
    dob: new Date("2002-12-24T00:00:00.000Z"),
    sex: "male",
    nationality: "India",
    role: "Wicketkeeper",
    battingStance: "Right handed",
    isWicketKeeper: true,
  },
  {
    id: 93_123,
    name: "Viren Bedi",
    age: 25,
    dob: new Date("2000-08-18T00:00:00.000Z"),
    sex: "male",
    nationality: "India",
    role: "Batter",
    battingStance: "Left handed",
  },
  {
    id: 93_124,
    name: "Kabir Sehgal",
    age: 22,
    dob: new Date("2003-01-28T00:00:00.000Z"),
    sex: "male",
    nationality: "India",
    role: "Bowler",
    battingStance: "Right handed",
    bowlingStance: "Legbreak",
  },
] as const;

const PLAYER_VERIFICATION_SEEDS = [
  {
    id: 93_201,
    playerId: 93_101,
    verificationType: "government_id",
    verificationId: "gov-93-101",
  },
  {
    id: 93_202,
    playerId: 93_102,
    verificationType: "government_id",
    verificationId: "gov-93-102",
  },
  {
    id: 93_203,
    playerId: 93_103,
    verificationType: "association_card",
    verificationId: "assoc-93-103",
  },
  {
    id: 93_204,
    playerId: 93_104,
    verificationType: "association_card",
    verificationId: "assoc-93-104",
  },
  {
    id: 93_205,
    playerId: 93_105,
    verificationType: "academy_certificate",
    verificationId: "academy-93-105",
  },
  {
    id: 93_206,
    playerId: 93_106,
    verificationType: "academy_certificate",
    verificationId: "academy-93-106",
  },
] as const;

const seedPlayers = async () => {
  await db.transaction(async (tx) => {
    for (const player of PLAYER_SEEDS) {
      await tx
        .insert(players)
        .values(player)
        .onConflictDoUpdate({
          target: players.id,
          set: {
            age: player.age,
            battingStance: player.battingStance,
            bowlingStance: player.bowlingStance,
            dob: player.dob,
            isWicketKeeper: player.isWicketKeeper ?? false,
            name: player.name,
            nationality: player.nationality,
            role: player.role,
            sex: player.sex,
          },
        });
    }

    for (const verification of PLAYER_VERIFICATION_SEEDS) {
      await tx
        .insert(playerVerification)
        .values(verification)
        .onConflictDoUpdate({
          target: playerVerification.id,
          set: {
            playerId: verification.playerId,
            verificationId: verification.verificationId,
            verificationType: verification.verificationType,
          },
        });
    }
  });
};

await seedPlayers();
