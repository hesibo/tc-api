/*
 * Copyright (C) 2013 - 2014 TopCoder Inc., All Rights Reserved.
 *
 * @version 1.3
 * @author TCSASSEMBLER, Sky_, xjtufreeman
 * change in 1.1:
 * - use before and after to setup and clean data
 * - use testHelper for data access
 * - merge successInput and validateDatabase into one test
 * change in 1.2:
 * - fix tests to the latest code (new sequence generation)
 * change in 1.3:
 * - fix tests to the latest code
 */
"use strict";
/*global describe, it, before, beforeEach, after, afterEach */
/*jslint node: true, stupid: true, unparam: true */

/**
 * Module dependencies.
 */
var fs = require('fs');
var supertest = require('supertest');
var assert = require('chai').assert;
var async = require("async");
var testHelper = require('./helpers/testHelper');
var SQL_DIR = "sqls/register_member/";
var API_ENDPOINT = process.env.API_ENDPOINT || 'http://localhost:8080';
var PASSWORD_HASH_KEY = process.env.PASSWORD_HASH_KEY || "default";

describe('Test Register Member API', function () {
    this.timeout(120000); // The api with testing remote db could be quit slow

    /**
     * Clear database
     * @param {Function<err>} done the callback
     */
    function clearDb(done) {
        async.waterfall([
            function (cb) {
                testHelper.runSqlFromJSON(SQL_DIR + "common_oltp__clean.json", cb);
            }, function (cb) {
                testHelper.runSqlFromJSON(SQL_DIR + "informixoltp__clean.json", cb);
            }
        ], done);
    }


    /**
     * This function is run before all tests.
     * Generate tests data.
     * @param {Function<err>} done the callback
     */
    before(function (done) {
        async.waterfall([
            clearDb,
            function (cb) {
                testHelper.runSqlFromJSON(SQL_DIR + "common_oltp__insert_test_data.json", cb);
            }
        ], done);
    });

    /**
     * This function is run after all tests.
     * Clean up all data.
     * @param {Function<err>} done the callback
     */
    after(function (done) {
        clearDb(done);
    });

    /// Check if the data are in expected structure and data
    it('should return errors if inputs are spaces only', function (done) {
        var text = fs.readFileSync("test/test_files/exptected_member_register_invalid_1.txt", 'utf8'),
            expected = JSON.parse(text);

        supertest(API_ENDPOINT)
            .post('/v2/users').set('Accept', 'application/json')
            .send({ firstName: ' ', lastName: ' ', handle: ' ', email: ' ', password: '123456', country: ' ' })
            .expect('Content-Type', /json/)
            .expect(400)
            .end(function (err, result) {
                if (!err) {
                    assert.deepEqual(JSON.parse(result.res.text).error.details, expected, "Invalid error message");
                }
                done(err);
            });
    });


    /// Check if the data are in expected structure and data
    it('should return errors: invalid country, email, firstname, lastname, handle, social', function (done) {
        var text = fs.readFileSync("test/test_files/exptected_member_register_invalid_2.txt", 'utf8'),
            expected = JSON.parse(text);

        supertest(API_ENDPOINT)
            .post('/v2/users').set('Accept', 'application/json')
            .send({ firstName: 'foooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooo', lastName: 'DELETE * FROM USER', handle: '_(#@*$', email: 'foofoo4foobar.com', password: '123456', country: 'xxx', socialProviderId: 1, socialUserName: "foo  DROP TABLE bar", socialEmail: "foobarfoobar.com", socialEmailVerified: 'xxx' })
            .expect('Content-Type', /json/)
            .expect(400)
            .end(function (err, result) {
                if (!err) {
                    assert.deepEqual(JSON.parse(result.res.text).error.details, expected, "Invalid error message");
                }
                done(err);
            });
    });

    /// Check if the data are in expected structure and data
    it('should return errors: invalid handle and invalid social id', function (done) {
        var text = fs.readFileSync("test/test_files/exptected_member_register_invalid_3.txt", 'utf8'),
            expected = JSON.parse(text);

        supertest(API_ENDPOINT)
            .post('/v2/users').set('Accept', 'application/json')
            .send({ firstName: 'foo', lastName: 'bar', handle: '1invalidHandle1', email: 'testHandleFoobar@foobar.com', password: '123456', country: 'Japan', socialProviderId: 999, socialUserName: "foobar", socialEmail: "foobar@foobar.com", socialEmailVerified: 't' })
            .expect('Content-Type', /json/)
            .expect(400)
            .end(function (err, result) {
                if (!err) {
                    assert.deepEqual(JSON.parse(result.res.text).error.details, expected, "Invalid error message");
                }
                done(err);
            });
    });

    /// Check if the user is prevented to register without a password when not using social login
    it('should return errors: no password provided when registering (no social login)', function (done) {
        var text = fs.readFileSync("test/test_files/exptected_member_register_invalid_4.txt", 'utf8'),
            expected = JSON.parse(text);

        supertest(API_ENDPOINT)
            .post('/v2/users').set('Accept', 'application/json')
            .send({ firstName: 'foo', lastName: 'bar', handle: 'testHandleFoo', email: 'testHandleFoo@foobar.com', country: 'Romania', regSource: "source1" })
            .expect('Content-Type', /json/)
            .expect(400)
            .end(function (err, result) {
                if (!err) {
                    assert.deepEqual(JSON.parse(result.res.text).error.details, expected, "Invalid error message");
                }
                done(err);
            });
    });

    //validateDatabase for test successInput
    var validateDatabase = function (done) {
        var text, userExpected, securityUserExpected, userGroupExpected, userSocialExpected;

        text = fs.readFileSync("test/test_files/exptected_member_register_validate_user.txt", 'utf8');
        userExpected = JSON.parse(text);
        text = fs.readFileSync("test/test_files/exptected_member_register_validate_security_user.txt", 'utf8');
        securityUserExpected = JSON.parse(text);
        text = fs.readFileSync("test/test_files/exptected_member_register_validate_user_group.txt", 'utf8');
        userGroupExpected = JSON.parse(text);
        text = fs.readFileSync("test/test_files/exptected_member_register_validate_user_social.txt", 'utf8');
        userSocialExpected = JSON.parse(text);

        async.series({
            user: function (callback) {
                testHelper.runSqlFromJSON(SQL_DIR + "common_oltp__select_user.json", true, callback);
            },
            security: function (callback) {
                testHelper.runSqlFromJSON(SQL_DIR + "common_oltp__select_security_user.json", true, callback);
            },
            social: function (callback) {
                testHelper.runSqlFromJSON(SQL_DIR + "common_oltp__select_user_social.json", true, callback);
            },
            group: function (callback) {
                testHelper.runSqlFromJSON(SQL_DIR + "common_oltp__select_user_group.json", true, callback);
            },
            userId: function (callback) {
                testHelper.runSqlFromJSON(SQL_DIR + "common_oltp__get_current_user_seq.json", true, callback);
            }
        }, function (err, results) {
            if (!err) {
                var id = results.userId[0].nextval - 1,
                    user = results.user[0],
                    security = results.security[0],
                    group = results.group,
                    social = results.social[0],
                    assertProp = function (obj, name, value, ok) {
                        if (ok) {
                            assert.ok(obj[name]);
                        } else {
                            assert.equal(value, obj[name]);
                        }
                        delete obj[name];
                    };
                assertProp(user, "activation_code", null, true);
                assertProp(user, "user_id", id);
                assert.deepEqual(userExpected, user, "Invalid returned message");

                assert.equal(group.length, 4);
                assertProp(group[0], "login_id", id);
                assertProp(group[1], "login_id", id);
                assertProp(group[2], "login_id", id);
                assertProp(group[3], "login_id", id);
                assert.deepEqual(userGroupExpected, group, "Invalid returned message");

                assertProp(security, "login_id", id);
                assert.deepEqual(securityUserExpected, security, "Invalid returned message");

                assertProp(social, "user_id", id);
                assert.deepEqual(userSocialExpected, social, "Invalid returned message");

                assert.equal("123456", testHelper.decodePassword(security.password, PASSWORD_HASH_KEY), "Password is not correct");
                done(err);
            } else {
                done(err);
            }
        });
    };

    /// Check if the data are in expected structure and data
    it('should register successfully', function (done) {
        supertest(API_ENDPOINT)
            .post('/v2/users').set('Accept', 'application/json')
            .send({ firstName: 'foo', lastName: 'bar', handle: 'testHandleFoo', email: 'testHandleFoo@foobar.com', password: '123456', country: 'Japan', socialProviderId: 1, socialUserName: "foobar", socialEmail: "foobar@foobar.com", socialEmailVerified: 't', regSource: "source1", "socialUserId": 2 })
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, result) {
                if (err) {
                    done(err);
                    return;
                }
                assert.isNumber(JSON.parse(result.res.text).userId);
                validateDatabase(done);
            });
    });

    /// Check if the user can register without a password when using social login
    it('should register successfully if no password is provided (via social login)', function (done) {
        supertest(API_ENDPOINT)
            .post('/v2/users').set('Accept', 'application/json')
            .send({ firstName: 'foo', lastName: 'bar', handle: 'testNoPasswd', email: 'testNoPasswd@foobar.com', country: 'Japan', socialProviderId: 1, socialUserName: "testNoPasswd", socialEmail: "testNoPasswd@foobar.com", socialEmailVerified: 't', regSource: "source1", "socialUserId": 1  })
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, result) {
                if (err) {
                    done(err);
                    return;
                }
                assert.isNumber(JSON.parse(result.res.text).userId);
                done();
            });
    });

    /// Check if the user is registered successfully with the correct default reg source
    it('should register successfully with the correct default reg source', function (done) {
        var text = fs.readFileSync("test/test_files/expected_member_register_validate_default_reg_source.txt", 'utf8'),
            expected = JSON.parse(text);

        supertest(API_ENDPOINT)
            .post('/v2/users').set('Accept', 'application/json')
            .send({ firstName: 'foo', lastName: 'bar', handle: 'testDRegSource', email: 'testDRegSource@foobar.com', password: '123456', country: 'Japan' })
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, result) {
                if (err) {
                    done(err);
                    return;
                }
                testHelper.runSqlFromJSON(SQL_DIR + "common_oltp__select_user_default_reg_source.json", true, function (err, result) {
                    if (!err) {
                        assert.deepEqual(result, expected, "Invalid returned message");
                        done(err);
                    } else {
                        done(err);
                    }
                });
            });
    });

    /// Check if the user is registered successfully with reg source "source1"
    it('should register successfully with reg source "source1"', function (done) {
        var text = fs.readFileSync("test/test_files/expected_member_register_validate_reg_source.txt", 'utf8'),
            expected = JSON.parse(text);

        supertest(API_ENDPOINT)
            .post('/v2/users').set('Accept', 'application/json')
            .send({ firstName: 'foo', lastName: 'bar', handle: 'testRegSource', email: 'testRegSource@foobar.com', password: '123456', country: 'Japan', regSource: "source1" })
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, result) {
                if (err) {
                    done(err);
                    return;
                }
                testHelper.runSqlFromJSON(SQL_DIR + "common_oltp__select_user_reg_source.json", true, function (err, result) {
                    if (!err) {
                        assert.deepEqual(result, expected, "Invalid returned message");
                        done(err);
                    } else {
                        done(err);
                    }
                });
            });
    });

    /// Check if the data are in expected structure and data
    it('should return if handle and email(case-insensitive) exists', function (done) {
        var text = fs.readFileSync("test/test_files/exptected_member_register_invalid_existing.txt", 'utf8'),
            expected = JSON.parse(text);

        supertest(API_ENDPOINT)
            .post('/v2/users').set('Accept', 'application/json')
            .send({ firstName: 'foo', lastName: 'bar', handle: 'testHandleFoo', email: 'TEstHandleFoo@foobar.com'.toLocaleLowerCase(), password: '123456', country: 'Japan', socialProviderId: 1, socialUserName: "foobar", socialEmail: "foobar@foobar.com", socialEmailVerified: 't', "socialUserId": 2 })
            .expect('Content-Type', /json/)
            .expect(400)
            .end(function (err, result) {
                if (!err) {
                    assert.deepEqual(JSON.parse(result.res.text).error.details, expected, "Invalid error message");
                }
                done(err);
            });
    });

    /// Check if the data are in expected structure and data
    it('should send email', function (done) {
        supertest(API_ENDPOINT)
            .post('/v2/users').set('Accept', 'application/json')
            .send({ firstName: 'foo', lastName: 'bar', handle: 'testForEmail', email: 'testForEmail@foobar.com', password: '123456', country: 'Japan' })
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err) {
                // examine the sent email manually
                done(err);
            });
    });

});
