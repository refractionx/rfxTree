#include <math.h>

double rfx_sqrt(double n) {
  double lo = 0.0, hi = n, mid;
  for(int i = 0 ; i < 5 ; i++){
      mid = (lo+hi)/2.0;
      if(mid*mid == n) return mid;
      if(mid*mid > n) hi = mid;
      else lo = mid;
  }
  return mid;
}
