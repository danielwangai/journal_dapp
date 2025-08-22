build:
	@anchor build
deploy:
	@anchor deploy
clean:
	@anchor clean

test:
	@anchor test --skip-local-validator

fmt-test:
	@npm run fmt
