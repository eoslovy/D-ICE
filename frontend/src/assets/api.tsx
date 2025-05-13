export const API = {
    async createRoom() {
        const url = `${
            import.meta.env.VITE_API_URL || "http://localhost:8080"
        }/backbone/rooms`;
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                throw new Error("방 생성 실패");
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error("방 생성 중 오류:", error);
            throw error;
        }
    },
};
