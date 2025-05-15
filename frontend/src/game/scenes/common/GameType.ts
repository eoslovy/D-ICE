// 게임 타입 정보를 따로 관리하는 컴포넌트(모듈)
export interface GameTypeInfo {
    name: string;
    key: string;
}

export const GAME_TYPES: GameTypeInfo[] = [
    { name: "반응속도 게임", key: "Reaction" },
    { name: "클리커", key: "Clicker" },
    { name: "원 그리기 게임", key: "PerfectCircle" },
    { name: "무궁화", key: "Mugungwha" },
    { name: "줄타기", key: "Wirewalk" },
    { name: "요세푸스", key: "Josephus" },
    { name: "염색", key: "Dye" },
    { name: "기사", key: "Knight" },
    { name: "숫자 생존게임", key: "NumberSurvivor" },
    { name: "판옵티콘", key: "Panopticon" },
    { name: "다이스", key: "Dice" },
];

