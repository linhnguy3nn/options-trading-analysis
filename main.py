# Run: uvicorn main:app --reload


from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from Analyzer import analyze_strategies 


app = FastAPI(
    title="OptionsFlow API",
    description="Options flow analysis: straddles, PCR, RV Rank, expected move.",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  
        "http://localhost:3000",
    ],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "running", "docs": "/docs"}


@app.get("/analyze/{ticker}")
def analyze(ticker: str):
    ticker = ticker.upper().strip()
    if not ticker.isalpha() or len(ticker) > 10:
        raise HTTPException(status_code=400, detail="Invalid ticker symbol")

    result = analyze_strategies(ticker)

    if result.get("error"):
        raise HTTPException(status_code=404, detail=result["error"])

    return result


