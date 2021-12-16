#include <math.h>

double rfx_log(double power, double base)
{
  double Whole;
  double N;
  double Sign;
  Sign = 1.0;

  if (power <= 1.0 || base <= 1.0)
  {
      if (power <= 0.0 || base <= 0.0 )
      {
          // TODO replace with NAN or handle the case
          return -900000000.0;
      }
      if (power < 1.0)
      {
          power = 1.0 / power;
          power *= -1.0;
      }
      if (power < 1.0)
      {
          Sign *= -1.0;
          base = 1.0 / base;
      }
      if (power == 1.0)
      {
          if (base != 1.0)
          {
              return 0.0;
          }
          return 1.0;
      }
  }

  Whole = power;
  N = 0.0;

  while (Whole >= base)
  {
      Whole /= base;
      N++;
  }
  if (Whole == 1.0)
  {
      return (Sign * N);
  }
  return Sign * (N + (1.0 / rfx_log(base, Whole)));
}
