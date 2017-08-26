/*
 This test deploys the coin contract and simulates that it does not sell out
 before the end of the tokensale - and then tests if the transfer function works.
 (please run this via testRPC - because it skips and waits for >1000 blocks)
*/
contract('CATToken', function(accounts) {

  var cattokencontract;
  var multisig_address = accounts[1];
  var founder_address = accounts[2];
  var developer_address = accounts[3];
  var rewards_address = accounts[4];

  var token_buyer = accounts[5];

  var self = this;

  var duration = 250 + 800; //168116; // 250 + 400; // 168116; coinsale duration in blocks

  var coinsale_start = self.web3.eth.blockNumber + 10;
  var coinsale_end = coinsale_start + duration;

  describe('Deploy CAT token', function() {
    it("should deploy CAT contract", function(done) {
      CATToken.new(multisig_address, coinsale_start, coinsale_end).then(function(instance) {
        cattokencontract = instance;
        assert.isNotNull(cattokencontract);
        done();
      });
    });

    it("should set reward addresses", function(done) {
      cattokencontract.setRewardAddresses(founder_address, developer_address, rewards_address).then(function() {
        done();
      });
    });
  });


  describe('Coinsale details', function() {
    it("coinsale details", function(done) {
      console.log('address:', cattokencontract.address);
      cattokencontract.multisig().then(function(q) {
        console.log('multisig:', q);
      });
      cattokencontract.founder().then(function(q) {
        console.log('founder:', q);
      });
      cattokencontract.developer().then(function(q) {
        console.log('developer:', q);
      });
      cattokencontract.rewards().then(function(q) {
        console.log('rewards:', q);
      });

      cattokencontract.rewards().then(function(q) {
        console.log('rewards:', q);
      });

      cattokencontract.startBlock().then(function(start) {
        console.log('startBlock:', start.toNumber());
        cattokencontract.endBlock().then(function(end) {
          console.log('endBlock:', end.toNumber());

          console.log('duration in blocks :', end - start)
          var duration_seconds = (end - start) * 14.3;
          console.log('duration in seconds :', duration_seconds);
          console.log('duration in days :', duration_seconds / 60 / 60 / 24);

          done();


        });

      });


    });


  });

  describe('Coinsale test', function() {
    it("should skip to startBlock-2", function(done) {
      skipblocks(coinsale_start - self.web3.eth.blockNumber, done);
    });

    it("token_buyer should have 0 CAT tokens", function(done) {
      return cattokencontract.balanceOf.call(token_buyer).then(function(balance) {
        assert.equal(balance.valueOf(), 0, "account not empty");
        done();
      });
    });


    it("should accept ETH and mint tokens", function(done) {

      console.log('tokenbuyer ETH balance=', self.web3.fromWei(self.web3.eth.getBalance(token_buyer), 'ether').toNumber());

      self.web3.eth.sendTransaction({
        from: token_buyer,
        to: cattokencontract.address,
        value: 1,
      }, function(r, s) {
        try {
          done();
        } catch (e) {
          assert.fail('this function should not throw');
          done();
        }
      });
    });

    it("token_buyer should have 125 CAT tokens", function(done) {
      //console.log('tokenbuyer ETH balance=', self.web3.fromWei(self.web3.eth.getBalance(token_buyer), 'ether').toNumber());
      cattokencontract.balanceOf.call(token_buyer).then(function(balance) {
        assert.equal(balance.valueOf(), 125, "purchase did not work");
        done();
      });
    });

    it("token owner should not be able to call allocateTokens yet", function(done) {
      cattokencontract.allocateTokens({
          from: accounts[0]
        })
        .then(function() {
          assert.fail('this function should throw');
          done();
        })
        .catch(function(e) {

          done();
        });
    });

    it("market should be inactive ( because not sold out yet )", function(done) {
      cattokencontract.marketactive().then(function(marketactive) {
        assert.equal(marketactive, false, "marketactive should be false");
        done();
      });
    });

    it("should skip past endBlock", function(done) {
      console.log('skipping ' + duration + ' blocks.. please wait');
      skipblocks(duration, done);
    });

    it("buying more tokens should not be possible", function(done) {
      console.log('tokenbuyer ETH balance=', self.web3.fromWei(self.web3.eth.getBalance(token_buyer), 'ether').toNumber());
      self.web3.eth.sendTransaction({
        from: token_buyer,
        to: cattokencontract.address,
        value: 1e18,
      }, function(r, s) {
        try {
          assert.fail('this function should throw');
          done();
        } catch (e) {
          done();
        }
      });
    });
  });


  describe('Post-coinsale transfers', function() {

    // now the account that has bought tokens - becomes the sender
    var token_sender = token_buyer;

    // recepient is just a random account
    var token_recepient = accounts[7];

    var sender_token_balance = 0;

    it("should get balance of token sender", function(done) {
      cattokencontract.balanceOf.call(token_sender).then(function(balance) {
        sender_token_balance = balance.valueOf();
        console.log('token_sender has ', sender_token_balance, 'CAT');
        assert.notEqual(balance.valueOf(), 0, 'token_sender should have some CAT to transfer');
        done();
      });
    });

    it("token recepient should have 0 CAT", function(done) {
      cattokencontract.balanceOf.call(token_recepient).then(function(balance) {
        console.log('token_recepient has ', balance.valueOf(), 'CAT');
        assert.equal(balance.valueOf(), 0, "token_recepient CAT balance not empty: " + balance.valueOf());
        done();
      });
    });

    it("transferring tokens should be possible (block > endBlock)", function(done) {
      cattokencontract.transfer(token_recepient, 1, {
          from: token_sender
        })
        .then(function() {
          done();
        })
        .catch(function(e) {
          assert.fail('this function should not throw');
          done();
        });
    });

    it("token recepient should have CAT", function(done) {
      cattokencontract.balanceOf.call(token_recepient).then(function(balance) {
        console.log('token_recepient has ', balance.valueOf(), 'CAT');
        assert.equal(balance.valueOf(), 1, "token_recepient CAT balance not empty: " + balance.valueOf());
        done();
      });
    });

    it("token sender should have less CAT", function(done) {
      cattokencontract.balanceOf.call(token_sender).then(function(balance) {
        console.log('token_sender has ', balance.valueOf(), 'CAT');
        assert.equal(balance.valueOf(), sender_token_balance - 1, "token_sender CAT balance after sale is wrong: " + balance.valueOf());
        done();
      });
    });


  });

  describe('Post-coinsale test', function() {

    it("founder_address should have 0 CAT tokens", function(done) {
      return cattokencontract.balanceOf.call(founder_address).then(function(balance) {
        assert.equal(balance.valueOf(), 0, "account not empty: " + self.web3.fromWei(balance.valueOf(), 'ether'));
        done();
      });
    });


    it("Check presaleEtherRaised < etherCap", function(done) {
      cattokencontract.etherCap().then(function(etherCap) {
        cattokencontract.presaleEtherRaised().then(function(presaleEtherRaised) {
          console.log('Ether raised so far:', self.web3.fromWei(presaleEtherRaised, 'ether').toNumber())
          console.log('Ether cap :', self.web3.fromWei(etherCap, 'ether').toNumber())
          assert.notEqual(presaleEtherRaised.toNumber(), etherCap.toNumber());
          done();
        });
      });
    });


    it("calling allocateTokens should not be possible by random account", function(done) {
      cattokencontract.allocateTokens({
          from: accounts[6]
        })
        .then(function() {
          assert.fail('this function should throw');
          done();
        })
        .catch(function(e) {
          done();
        });
    });

    it("founder_address should have 0 CAT tokens", function(done) {
      return cattokencontract.balanceOf.call(founder_address).then(function(balance) {
        assert.equal(balance.valueOf(), 0, "account not empty");
        done();
      });
    });

    it("calling allocateTokens should be possible by creator", function(done) {
      cattokencontract.allocateTokens({
          from: accounts[0]
        })
        .then(function() {
          done();
        })
        .catch(function(e) {
          assert.fail('this function should not throw');
          done();
        });
    });

    it("founder_address should now CAT tokens", function(done) {
      return cattokencontract.balanceOf.call(founder_address).then(function(balance) {
        assert.notEqual(balance.valueOf(), 0, "account not empty");
        console.log('founder address has', self.web3.fromWei(balance.valueOf(), 'ether'), 'CAT');
        done();
      });
    });


  });

  function skipblocks(count, cb) {
    self.web3.eth.sendTransaction({
      from: accounts[2],
      to: accounts[3],
      value: 1,
    }, function() {
      if (count == 0) {
        console.log('we\'re now at block', self.web3.eth.blockNumber);
        cb();
      } else {
        skipblocks(count - 1, cb);
      }
    });
  }

});