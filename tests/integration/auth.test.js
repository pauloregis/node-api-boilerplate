/* eslint-disable arrow-body-style */
import request from 'supertest';
import httpStatus from 'http-status';
import { expect } from 'chai';
import app from './../../src/index';
import User from './../../src/api/models/user.model';
import RefreshToken from '../../src/api/models/refreshToken.model';

describe('Authentication API', () => {
  let dbUser;
  let user;
  let refreshToken;

  beforeEach((done) => {
    dbUser = {
      email: 'branstark@gmail.com',
      password: 'mypassword',
      name: 'Bran Stark',
      role: 'admin',
    };

    user = {
      email: 'ren4n.oliveir4@gmail.com',
      password: '123456',
      name: 'Renan Oliveira',
    };

    refreshToken = {
      token: '5947397b323ae82d8c3a333b.c69d0435e62c9f4953af912442a3d064e20291f0d228c0552ed4be473e7d191ba40b18c2c47e8b9d',
      userId: '5947397b323ae82d8c3a333b',
      userEmail: dbUser.email,
      expires: new Date(),
    };
    User.remove({})
      .then(() => {
        User.create(dbUser).then(() => {
          RefreshToken.remove({});
          done();
        });
      });
  });

  describe('POST /v1/auth/register', () => {
    it('should register a new user when request is ok', (done) => {
      request(app)
        .post('/v1/auth/register')
        .send(user)
        .expect(httpStatus.CREATED)
        .then((res) => {
          delete user.password;
          expect(res.body.token).to.have.a.property('accessToken');
          expect(res.body.token).to.have.a.property('refreshToken');
          expect(res.body.token).to.have.a.property('expiresIn');
          expect(res.body.user).to.include(user);
          done();
        });
    });
    it('should report error when email already exists', (done) => {
      request(app)
        .post('/v1/auth/register')
        .send(dbUser)
        .expect(httpStatus.CONFLICT)
        .then((res) => {
          const field = res.body.errors[0].field;
          const location = res.body.errors[0].location;
          const messages = res.body.errors[0].messages;
          expect(field).to.be.equal('email');
          expect(location).to.be.equal('body');
          expect(messages).to.include('"email" already exists');
          done();
        });
    });

    it('should report error when the email provided is not valid', (done) => {
      user.email = 'this_is_not_an_email';
      request(app)
        .post('/v1/auth/register')
        .send(user)
        .expect(httpStatus.BAD_REQUEST)
        .then((res) => {
          const field = res.body.errors[0].field[0];
          const location = res.body.errors[0].location;
          const messages = res.body.errors[0].messages;
          expect(field).to.be.equal('email');
          expect(location).to.be.equal('body');
          expect(messages).to.include('"email" must be a valid email');
          done();
        });
    });

    it('should report error when email and password are not provided', (done) => {
      request(app)
        .post('/v1/auth/register')
        .send({})
        .expect(httpStatus.BAD_REQUEST)
        .then((res) => {
          const field = res.body.errors[0].field[0];
          const location = res.body.errors[0].location;
          const messages = res.body.errors[0].messages;
          expect(field).to.be.equal('email');
          expect(location).to.be.equal('body');
          expect(messages).to.include('"email" is required');
          done();
        });
    });
  });

  describe('POST /v1/auth/login', () => {
    it('should return an accessToken and a refreshToken when email and password matches', (done) => {
      request(app)
        .post('/v1/auth/login')
        .send(dbUser)
        .expect(httpStatus.OK)
        .then((res) => {
          delete dbUser.password;
          expect(res.body.token).to.have.a.property('accessToken');
          expect(res.body.token).to.have.a.property('refreshToken');
          expect(res.body.token).to.have.a.property('expiresIn');
          expect(res.body.user).to.include(dbUser);
          done();
        });
    });

    it('should report error when email and password are not provided', (done) => {
      request(app)
        .post('/v1/auth/login')
        .send({})
        .expect(httpStatus.BAD_REQUEST)
        .then((res) => {
          const field = res.body.errors[0].field[0];
          const location = res.body.errors[0].location;
          const messages = res.body.errors[0].messages;
          expect(field).to.be.equal('email');
          expect(location).to.be.equal('body');
          expect(messages).to.include('"email" is required');
          done();
        });
    });

    it('should report error when the email provided is not valid', (done) => {
      user.email = 'this_is_not_an_email';
      request(app)
        .post('/v1/auth/login')
        .send(user)
        .expect(httpStatus.BAD_REQUEST)
        .then((res) => {
          const field = res.body.errors[0].field[0];
          const location = res.body.errors[0].location;
          const messages = res.body.errors[0].messages;
          expect(field).to.be.equal('email');
          expect(location).to.be.equal('body');
          expect(messages).to.include('"email" must be a valid email');
          done();
        });
    });

    it('should report error when email and password don\'t match', (done) => {
      request(app)
        .post('/v1/auth/login')
        .send(user)
        .expect(httpStatus.UNAUTHORIZED)
        .then((res) => {
          const code = res.body.code;
          const message = res.body.message;
          expect(code).to.be.equal(401);
          expect(message).to.be.equal('Incorrect email or password');
          done();
        });
    });
  });

  describe('POST /v1/auth/refresh-token', () => {
    it('should return a new accessToken when refreshToken and email match', (done) => {
      RefreshToken.create(refreshToken)
        .then(() => {
          request(app)
            .post('/v1/auth/refresh-token')
            .send({ email: dbUser.email, refreshToken: refreshToken.token })
            .expect(httpStatus.OK)
            .then((res) => {
              expect(res.body).to.have.a.property('accessToken');
              expect(res.body).to.have.a.property('refreshToken');
              expect(res.body).to.have.a.property('expiresIn');
              done();
            });
        });
    });

    it('should report error when email and refreshToken don\'t match', (done) => {
      RefreshToken.create(refreshToken)
        .then(() => {
          request(app)
            .post('/v1/auth/refresh-token')
            .send({ email: user.email, refreshToken: refreshToken.token })
            .expect(httpStatus.UNAUTHORIZED)
            .then((res) => {
              const code = res.body.code;
              const message = res.body.message;
              expect(code).to.be.equal(401);
              expect(message).to.be.equal('Incorrect email or refreshToken');
              done();
            });
        });
    });

    it('should report error when email and refreshToken are not provided', (done) => {
      request(app)
        .post('/v1/auth/refresh-token')
        .send({})
        .expect(httpStatus.BAD_REQUEST)
        .then((res) => {
          const field1 = res.body.errors[0].field[0];
          const location1 = res.body.errors[0].location;
          const messages1 = res.body.errors[0].messages;
          const field2 = res.body.errors[1].field[0];
          const location2 = res.body.errors[1].location;
          const messages2 = res.body.errors[1].messages;
          expect(field1).to.be.equal('email');
          expect(location1).to.be.equal('body');
          expect(messages1).to.include('"email" is required');
          expect(field2).to.be.equal('refreshToken');
          expect(location2).to.be.equal('body');
          expect(messages2).to.include('"refreshToken" is required');
          done();
        });
    });
  });
});
