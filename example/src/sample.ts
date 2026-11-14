import type { MindMapData } from "@ehfuse/mindmap";

/** Sample map — a small product launch plan. */
export const SAMPLE: MindMapData = {
    direction: 2,
    nodeData: {
        id: "root",
        topic: "신제품 출시",
        children: [
            {
                id: "a",
                topic: "시장 조사",
                children: [
                    { id: "a1", topic: "경쟁사 분석" },
                    { id: "a2", topic: "고객 인터뷰 10명", style: { color: "#1a73e8", fontWeight: "bold" } },
                ],
            },
            {
                id: "b",
                topic: "개발",
                children: [
                    { id: "b1", topic: "시제품" },
                    { id: "b2", topic: "베타 테스트", style: { background: "#fff8c5" } },
                    { id: "b3", topic: "출시 버전" },
                ],
            },
            {
                id: "c",
                topic: "마케팅",
                children: [
                    { id: "c1", topic: "보도자료" },
                    { id: "c2", topic: "SNS 캠페인", style: { textDecoration: "underline" } },
                ],
            },
            {
                id: "d",
                topic: "일정",
                expanded: false,
                children: [
                    { id: "d1", topic: "12월 베타" },
                    { id: "d2", topic: "2월 출시" },
                ],
            },
        ],
    },
};
