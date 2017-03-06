import { Fixtures } from './fixtures';
import { Server } from 'spirit.io/lib/application';
import { Session } from '../lib/models/session';
import { setup } from 'f-mocha';
import { expect } from 'chai';

// this call activates f-mocha wrapper.
setup();

let server: Server;

describe('Sessions tests:', () => {

    before(function (done) {
        this.timeout(10000);
        server = Fixtures.setup(done);

    });

    let cookies = [];

    it('Authentication without any credentials should fail', () => {
        let resp = Fixtures.post('/login', null);
        expect(resp.status).to.equal(401);
        expect(resp.headers).to.have.property('www-authenticate', 'Basic');
    });

    it('Logout without session set should fail', () => {
        let resp = Fixtures.get('/logout');
        expect(resp.status).to.equal(500);
        let body = JSON.parse(resp.body);
        expect(body.$diagnoses).to.be.a('array');
        expect(body.$diagnoses.length).to.equal(1);
        expect(body.$diagnoses[0].$severity).to.equal("error");
        expect(body.$diagnoses[0].$message).to.equal("Logout failed. No session found.");
    });

    it('Authentication with correct credentials should work', () => {
        const auth = 'Basic ' + new Buffer('admin:admin', 'utf8').toString('base64');
        let resp = Fixtures.post('/login', null, {
            authorization: auth
        });
        expect(resp.status).to.equal(200);
        // store cookie
        cookies.push(resp.headers['set-cookie'][0]);
        // second login for incrementing sessions count
        resp = Fixtures.post('/login', null, {
            authorization: auth
        });
        expect(resp.status).to.equal(200);
        // store cookie
        cookies.push(resp.headers['set-cookie'][0]);
    });

    it('Authentication with bad auth header should fail', () => {
        let resp = Fixtures.post('/login', null, {
            authorization: 'Basic badstring'
        });
        let body = JSON.parse(resp.body);
        expect(resp.status).to.equal(401);
        expect(body.$diagnoses).to.be.a('array');
        expect(body.$diagnoses.length).to.equal(1);
        expect(body.$diagnoses[0].$severity).to.equal("error");
        expect(body.$diagnoses[0].$message).to.equal("Authorization required");
    });

    it('Authentication with empty auth header should fail', () => {
        let resp = Fixtures.post('/login', null, {
            authorization: 'Basic '
        });
        let body = JSON.parse(resp.body);
        expect(resp.status).to.equal(401);
        expect(body.$diagnoses).to.be.a('array');
        expect(body.$diagnoses.length).to.equal(1);
        expect(body.$diagnoses[0].$severity).to.equal("error");
        expect(body.$diagnoses[0].$message).to.equal("Authorization required");
    });

    it('Sessions count should be ok after two succesful login', () => {
        expect(Session.all().length).to.equal(2);
    });

    it('Delete session should be ok', () => {
        let sid = cookies[1].match(/s%3A(.*)\./)[1];
        let resp = Fixtures.delete('/api/v1/session/' + sid, {
            cookie: cookies[0]
        });
        expect(resp.status).to.equal(204);
    });

    it('Request with deleted session id should fail', () => {
        let resp = Fixtures.get('/api/v1/session', {
            cookie: cookies[1]
        });
        let body = JSON.parse(resp.body);
        expect(resp.status).to.equal(401);
        expect(body.$diagnoses).to.be.a('array');
        expect(body.$diagnoses.length).to.equal(1);
        expect(body.$diagnoses[0].$severity).to.equal("error");
        expect(body.$diagnoses[0].$message).to.equal("AUTHENTICATION_REQUIRED");
    });

    it('Session should have been deleted from datastore', () => {
        let sid = cookies[0].match(/s%3A(.*)\./)[1];
        let resp = Fixtures.get('/api/v1/session', {
            cookie: cookies[0]
        });
        let body = JSON.parse(resp.body);
        expect(resp.status).to.equal(200);
        expect(body.length).to.equal(1);
        expect(body[0].id).to.equal(sid);
        expect(body[0].user).to.equal('admin');
    });

    it('Delete current session should fail', () => {
        let sid = cookies[0].match(/s%3A(.*)\./)[1];
        let resp = Fixtures.delete('/api/v1/session/' + sid, {
            cookie: cookies[0]
        });
        let body = JSON.parse(resp.body);
        expect(resp.status).to.equal(500);
        expect(body.$diagnoses).to.be.a('array');
        expect(body.$diagnoses.length).to.equal(1);
        expect(body.$diagnoses[0].$severity).to.equal("error");
        expect(body.$diagnoses[0].$message).to.equal("Current session can't be destroyed");
    });

    it('Delete unexisting session should fail', () => {
        let resp = Fixtures.delete('/api/v1/session/1234', {
            cookie: cookies[0]
        });
        let body = JSON.parse(resp.body);
        expect(resp.status).to.equal(500);
        expect(body.$diagnoses).to.be.a('array');
        expect(body.$diagnoses.length).to.equal(1);
        expect(body.$diagnoses[0].$severity).to.equal("error");
        expect(body.$diagnoses[0].$message).to.equal("Session id not found. No session destroyed");
    });

    it('Get session details should work', () => {
        let cookie = cookies[0]
        let sid = cookie.match(/s%3A(.*)\./)[1];
        let resp = Fixtures.get('/api/v1/session/' + sid, {
            cookie: cookie
        });
        let body = JSON.parse(resp.body);
        expect(resp.status).to.equal(200);
        expect(body.user).to.equal('admin');
    });

    it('Logout with session set should succeed', () => {
        let resp = Fixtures.get('/logout', {
            cookie: cookies[0]
        });
        expect(resp.status).to.equal(200);
        let body = JSON.parse(resp.body);
        expect(body.$diagnoses).to.be.a('array');
        expect(body.$diagnoses.length).to.equal(1);
        expect(body.$diagnoses[0].$severity).to.equal("info");
        expect(body.$diagnoses[0].$message).to.equal("User 'admin' logged out successfully");
    });
});