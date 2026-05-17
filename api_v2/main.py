import chess
import chess.pgn
import chess.engine
import io
import os
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class PGNData(BaseModel):
    pgn: str

class ChessBoard(BaseModel):
    fen: str

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Chess Analysis API is running"}

def get_stockfish_path():
    paths = ["/usr/games/stockfish", "stockfish", "/usr/bin/stockfish"]
    for p in paths:
        if os.path.exists(p) or os.access(p, os.X_OK):
            return p
    return "stockfish"

@app.post("/analyze")
def analyze_position(board: ChessBoard):
    try:
        b = chess.Board(board.fen)
        def get_piece_name(symbol):
            names = {'p': '폰', 'n': '나이트', 'b': '비숍', 'r': '룩', 'q': '퀸', 'k': '킹'}
            return names.get(symbol.lower(), '기물')

        white_attackers = []
        black_attackers = []
        for square in chess.SQUARES:
            piece = b.piece_at(square)
            if piece:
                attackers_mask = b.attackers(not piece.color, square)
                for attacker_sq in attackers_mask:
                    attacker_piece = b.piece_at(attacker_sq)
                    attacker_name = get_piece_name(attacker_piece.symbol())
                    target_name = get_piece_name(piece.symbol())
                    msg = f"{'백' if attacker_piece.color else '흑'} {attacker_name}({chess.square_name(attacker_sq)})가 {'백' if piece.color else '흑'} {target_name}({chess.square_name(square)})를 공격하고 있습니다."
                    if attacker_piece.color == chess.WHITE: white_attackers.append(msg)
                    else: black_attackers.append(msg)
        
        pins = []
        for square in chess.SQUARES:
            if b.is_pinned(b.turn, square):
                pins.append(f"{chess.square_name(square)}칸의 {get_piece_name(b.piece_at(square).symbol())}은(는) 핀에 의해 움직임이 제한됩니다.")
        
        center_squares = [chess.D4, chess.D5, chess.E4, chess.E5]
        center_control = { 'white': 0, 'black': 0 }
        for sq in center_squares:
            if b.is_attacked_by(chess.WHITE, sq): center_control['white'] += 1
            if b.is_attacked_by(chess.BLACK, sq): center_control['black'] += 1
        
        king_safety = {
            'white_in_check': b.is_check() and b.turn == chess.WHITE,
            'black_in_check': b.is_check() and b.turn == chess.BLACK
        }

        return JSONResponse(content={
            "fen": board.fen,
            "facts": {
                "white_attackers": white_attackers,
                "black_attackers": black_attackers,
                "pins": pins,
                "center_control": center_control,
                "king_safety": king_safety
            }
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/analyze-pgn")
async def analyze_pgn(data: PGNData):
    # (PGN 분석 로직은 생략하거나 최소한으로 유지하여 배포 속도 향상)
    return JSONResponse(content={"message": "PGN analysis endpoint is active", "pgn_received": data.pgn[:50]})
