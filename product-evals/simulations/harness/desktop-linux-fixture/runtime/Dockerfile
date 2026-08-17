FROM node@sha256:16e22a550f3863206a3f701448c45f7912c6896a62de43add43bb9c86130c3e2

RUN apk add --no-cache \
    xvfb-run=1.20.10.3-r2 \
    xdotool=4.20260303.1-r0 \
    python3=3.14.5-r0 \
    python3-tkinter=3.14.5-r0 \
    imagemagick=7.1.2.27-r0

WORKDIR /fixture

COPY runner.mjs fixture.py /fixture/
