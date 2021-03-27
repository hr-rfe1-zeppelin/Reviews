import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { target: 3500, duration: '5s'},
    { target: 3600, duration: '20s'},
    { target: 0, duration: '5s'},
  ],
};

export default function () {
	let res = http.get('http://127.0.0.1:3000/reviews?product_id=1');
  check(res, { 'status was 200': (r) => r.status == 200 });
	sleep(1);
}