FROM python:3.8.10

WORKDIR /usr/app

ENV DTYPE="float32" \ 
  CLIP_CONTEXTS="3" \ 
  AMP="1" \ 
  MODEL="stable-diffusion" \
  DEV="True" \
  MODEL_PATH="models/animefull-final-pruned" \
  ENABLE_EMA="1" \
  VAE_PATH="models/animevae.pt" \
  PENULTIMATE="1" \
  PYTHONDONTWRITEBYTECODE="1" \
  PYTHON="/usr/app/venv/bin/python" \
  PATH="/usr/app/venv/bin:$PATH"

EXPOSE 6969

COPY . .

RUN pip install -r requirements.txt

VOLUME ["/usr/app/models"]

CMD ["./run.sh"]