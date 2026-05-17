from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import chess
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# 프론트엔드에서의 요청을 허용하기 위한 CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChessBoard(BaseModel):
    fen: str

@app.post("/analyze")
def analyze_position(board: ChessBoard):
    try:
        b = chess.Board(board.fen)
        
        # 기물 이름 매핑 함수
        def get_piece_name(symbol):
            names = {'p': '폰', 'n': '나이트', 'b': '비숍', 'r': '룩', 'q': '퀸', 'k': '킹'}
            return names.get(symbol.lower(), '기물')

        white_attackers = []
        black_attackers = []
        
        for square in chess.SQUARES:
            piece = b.piece_at(square)
            if piece:
                # 모든 공격자 찾기 (폰의 공격 포함)
                attackers_mask = b.attackers(not piece.color, square)
                for attacker_sq in attackers_mask:
                    attacker_piece = b.piece_at(attacker_sq)
                    
                    # 기물 이름 명확하게 표기
                    attacker_name = get_piece_name(attacker_piece.symbol())
                    target_name = get_piece_name(piece.symbol())
                    
                    msg = (
                        f"{'백' if attacker_piece.color else '흑'} {attacker_name}({chess.square_name(attacker_sq)})"
                        f"가 {'백' if piece.color else '흑'} {target_name}({chess.square_name(square)})"
                        f"를 공격하고 있습니다."
                    )
                    
                    if attacker_piece.color == chess.WHITE:
                        white_attackers.append(msg)
                    else:
                        black_attackers.append(msg)
        
        pins = []
        for square in chess.SQUARES:
            if b.is_pinned(b.turn, square):
                pins.append(f"{chess.square_name(square)}칸의 {get_piece_name(b.piece_at(square).symbol())}은(는) 핀에 의해 움직임이 제한됩니다.")
        
        return JSONResponse(content={
            "fen": board.fen,
            "facts": {
                "white_attackers": white_attackers,
                "black_attackers": black_attackers,
                "pins": pins
            }
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
