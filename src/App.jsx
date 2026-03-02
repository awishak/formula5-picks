import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import Schedule from "./Schedule.jsx";
import Rules from "./Rules.jsx";
import Admin from "./Admin.jsx";
import RaceResults from "./RaceResults.jsx";
import MyPicks, { PickHistory } from "./MyPicks.jsx";
import PlayerStandings from "./PlayerStandings.jsx";
import TeamStandings from "./TeamStandings.jsx";
import Strategy from "./Strategy.jsx";
import F1Calendar from "./F1Calendar.jsx";
import Players from "./Players.jsx";
import PracticePicks from "./PracticePicks.jsx";

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

const BG = "#f4f4f6", BG2 = "#ededef", DARK = "#1e1e2a", BLUE = "#6cb8e0", BLUEDARK = "#2a6fa8", GREEN = "#22cc66", TEXT = "#1e1e2a", TEXT2 = "#6b6b80", BORDER = "#d8d2c4";
const LOGO_B64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAu4AAADDCAMAAADqbmQ5AAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAClUExURf///5nd7qrd7pnM7pnM3bvd7ojM7nfM7nfM3WbM7ma77ne77ojM3Xe73Xe7/2a7/2bM/6rd/4i73arM7ma73bvu7oi77rvu/8z//6rM3czu/5nd3aru/8zu7oi7zJm73czd7qrMzLvd/6rd3WbM3Xe7zIjd7rvM3Zm7zKq73bvd3bvM7qq7zFW73ZnM/6ru7pnd/4jMzJm77neqzJnMzMzd/3fM/wGHeXcAAAABdFJOUwBA5thmAAAAAWJLR0QAiAUdSAAAAAd0SU1FB+oDAgAeMoo0TkAAADQgSURBVHja7Z0Nm+I4kqBBkm2sj4YUrmSgu6Enq3OmrmZvp3f37v7/TztFhCTL2CbBZAJZpXi6kyzSYFt+HQ6F4mM2e0+ZMzbnXDjhrQgvPH07ea8jvP14eIsV7F0PMkuWa6WYi7KsFnUrUkr6RYFIFOVFBqm70n1DKvfPym1eleU8I5/lQYTN9cIYRPUY4GGJ3PdwH/y8e9cYkYHP8gDCeElMgto+i/a6Ou++qKr4090Ihhf3PtUsP7vw0hj1y3K5RFtlDGJS22feDOmnpH9dLldSZQWf5a7CSke4JHM8ADoidb0EWa3wh5cU7NEPwo3keHe7Kef3PuEsP68UwtT1ysHop6ir5VvYpnNUeYmgpV9Jxe99zll+VnF2jEr8KUOulkR1xw3SzSLM1Zg5E9049IvJ+j3LPYQJJf30tKu1z7PJnapuTfM3tg3f62waabL9nuX2AlZ73zw/slHeMstPS/i6pZTKf5XbZ/V071PP8tMJM8likVzVCaCD+rmnrQfZrgeUPT4K2junltl8z3Jj4UZWqp1vLlPz+kyL5myBPTnK4x1ls/s9y01lbciQbv0mPUvm3WCXnaeC+5cR9z79LD+VCCNXHbaVqju+xaZppDdCYrzAFDFkMtE0FW8piKLRX+49AFl+ImFEe6JxCUhjtOZ8TsLeS+b8WYVpKu0pOyOz3E6YrVd1CAoIhos0CyHY5iP297fCPU3aO8s9O/S9hyDLTyPMKjQtyK72C0eqZB9pYQgT5sV4f2Xcs9xKeCQvavfqo2O3NhrDiyUG6CzzUlOWW8m29T8qSaHo+uNt6bnB2wufK3Kpsisyy02kWLRLRH4GyW/gKNmUYD3hrpWSKmv3LDcRYeL81BkxMEW9ySLn3wLuy9r9knHPchOZGxXWN/Gn0bchL+KOPzLuWW4hu7KNd6khdMDeCLxgzJD7c5Ft9yw3kF+b1Sp4H+t6KRe3UrO/tdrd/bzZbrP81KLlatnGsCzVzZY3uZJ+qgo/s989yw2EGUjVa0O2bheKK+Qq5kFl3LPcRHiI0iLg9e1MaB5j0jLuWW4jm0r5CSOq+Gp7u11bCVULPO4q457l44VVS8xMXdY1rDDdMKvoycdgEu+3mzJk+YmldAY0cL5cAe63dI/MVUhWhZly9SGBl1mypFJYHxW2xPjfW1oUGvJHYmBamXHP8uECGXuoYpfgfL9pjkXZBupkWybLTYSr4IIEa+aWCdJsESIXwKbJyUxZbiA6lKcG9a5umR/9q0kSY286acjy00os7+vU+03LAWy0TPNisxsyy8cLU7FotQPf3LAaAFv45SWcKueySlluIEytsBjACnEvd7fbMw/p3/RoybZMlo8XLj3ubp4q5Q2ni4VpiwZDYmx2Q2b5eIGONBBEAGHuy1smWHCFJShrcH/KOld4z3ILAdxXS1/G7oa4s1BkZoXU5yoEWW4hsMgUu8ssbjZTfSplqL8He1flvcchy88gO52WoK5utdsNp8UlXGByvGflnuUWsrO+PyQ2YHq+1V7ngDqY7Rh6nJ3uWW4jG0XGzApnjDcyKTZzKgC8wgLAdbbcs9xInhSWnFbYuuBGRUmRdrdXmqRCSSX9+73HIctPIQUvOcf/uRD6JiEEjJtahr5MWCLyLeX+hdu9ttYkYq3Vhz/uPXpZspyWHdMqhA4Q7bU5aUMxQZw32E4himxMbm9zrWyt3f/dvYr9wkLOZnGw9j5NVLagzewUeWQINk/cd8DxQe4wU9XjC6qMI+vAt4GuHx156DP9FCJMY/bude9G2M5gMcS93mVUD8Z4deb0mL/iZ8hDT/s28xLbwvtYGbmqK6Oq8byOgrvTJrS1tvzpJQpjjIvtH/c+oc8upcMdMLf+lRkH2134ObgrLYFymEL2HuUn5LLD5fREeH7GF7Zx8vs7CH7375vdxksB7Wn0YtE2lowVWMeLr3orxqgyZ358jJRNwF3eGXftbjhj9+ZSsfszC2ccvsLP56Q/mJNSa10NSNn5B8rRBh0h+2+rn9sNVZyatikdRq5Wko8EYe6gl407n/JjeuVkmT0U7o72Dwubmgu9QKOtUHVn3li/1UryvGaTNPfUhqLA5NHn285+ciXLkdHdgSHjLsY6vMGeyvamLp/djZA7U14rD4S7U20fcz0Zd1bFn3W9mAHusWjdiuTNfqhv0Y5FBegUKrnqfNK3p0yatErzMnKUQjnr7dXf8EyQYdPAm6EJptnnqeqV8uPjzgSgXjm6IUCGqVgsL5Au0fBIVbBU8FZ8T8E/4K1KyaptlpqqbY+7UuGrV6u6/b40Y2+M2K1VceTXGmfqaYPjCbOULH15HNytu6aAOxOwCCQukFPfuuEV5emp1S/A5FodaV9H8ZHRMdDgGhEeMnN6uLd5sH2Lxt0q452DUZnTDFWQVwrmJWHyal5f4WfG/Up5PNy5UTBj63udx+R1Pfqdm7VWwKl0uC+XwCSXHRAdg1V1Hu7BcDmBe4kPAT9RVce3hjuh8eKrAsYdLRlmUbUbzcfPK8tEeRzctdsx4D6nNZYzvZCgBEcZYnjrLLHZmKwR91K1APdnoaE073nT1GS+63GvW29M7HOGNxAGESg+7nLZGyntbOazQIwRmfWPkAfCvSHchQGPpLb6PCmfR1fF5q1NjvSB8vS4S9/edAD30MPGNxeWQ5i3FQW8RNyrI9WPu0FN75T3eBo43Jd49lAnIe0U9VIkfebzTPVaeTzcuWlIz10roCfroKwBbcDdBs2O7y0HtXvsnTSq1cdwd7PZ1MapcdJABv3pZmfaKIrOFLDGpum+EMJ2w8SyZ+ZaeSTcab1x7Sh9Dw/Nr8abz546qjrQwX35lhfybIm4p0tLtVft8i3YZ4VtFE5cwD9j6GbHWWrwQcK3KHOrhmk/rjwi7s175PrMmzrBXSa4y9YV+V60B9zVL+1XJnMEVc5PL5TCOeOo48IqhuoJRP1o/Thr9yvlIXGn5/rBnhMjacyg5cNjgzuyZwLuYmCa6h2SVaW8l502r9DNovoBBrRZx+9O96euoIZ27bXxkkwlWb0dFcDdqONpWBmMGqBdWc2zQn9PeWDck/CZiz0zzKjlKkwYa0quwN4wmhDsFDhK9HDnHTnmojl2ZgZHpFgkRSCxHY2xnD29fe6iocQqN/oKg+FRy1ueg2feWR4YdyPPkaZ57R8u00r9Ep0rNWlcPL8ywV3WFcYfvoN4c/s1+baq1K/6zGivcO7CXwV4o8khMu8vj4c7T3BvzBnrTX2LdleC4S4D14S7wfSVFPda/ePdY9ImDV0BpjvAnVwFMuGzvK88Mu7OLGeTeMRIAeXdI4S7smQFt7iDc/BBCtcVxjthtVH4ug2LTlneVx4Z96nJmcySizH0dHSGjObegi5lUPr16qMiMC8WxB2UufZxMWC650o0HyCPiLuMxsw0R3MZo7pW6G9Xhhfdv5EvUpoHWalnAXeYlONYuNcHefL8WPKQuMuA+6Qj4UexAZ1vKYPTBP/wIH5sxB1uPYifwLEwzaMYWj+WPCLuyuPeTMNdx5B2H6uSfknVwf1lwtd/gBSQxwFH2eL+gZldP7P8eLhjqAxNUhH3bsevKrjW4ae+YeuO04eccb+N/Hi482iaY+Bv1f2KKl0fMvc4zwFh4G7NuN9AHhl3M2UuuSnb1U6wZ46+oUqMevUouD+FkkkBd3sx7gVbYxVArX2K1/pe85KC25hnxtlI9taXYp6ko/HiVlblNNxhcGFotR9g/g6h2IO4X+4pZLFJsBxoCcPSHCO1uMkQj8o/hRYHwcS2bPq4N+W2k6H4bXzVacs5BQpLCKkIiX/Gar4+jdFBrPFb/9dBHPCL3G6SseIMbiBr4Qr/M/mYYFv/MVz4/f6NsXBwmFFO+/f1ocp1T2VtOJZK81vRsYrx4KCtP7qZOBy29CoGB+ObPQg6DSb8gR6ONrwcd7YWdmBt07oxuSrE451wn1MxAB+2cvx4SHGnIJr7SfHtlUbuFcpJHeHeyGbfjXUfGwphiZ1GhuVnKq6G7NvDiWu5dR9EvN2e7L9mmFmz/w//R7yDYlzSa3IbbPfmFfnb04r21p0G/nvD8SN/+upuJBDk12EOywI2Ids85Hw142VFBJy9e/22p3DA7/vh8oF/wPuwK/FqXuF16z546E7PLsSdynU2PlrFj244L3fEV6zbvA/uO53gvuwtTTL5QLhbutpYLLCPu4xFBIm4waEo3PVQuBlqHI1Bou6J2xaaPBFpL2IcpqFrbqWvlBB0dAQyDTsVvuDcDOorOmOFN/+7AdyZDiodHgjhXoWjS45957465J1DwpqJDKUldrqH2dASs411HYcXZF5CKIZwd9x65iOQrsD9X5QjT6NrQZ9bPGYaHIxwsZNXbt4H999MEsa4PLbcZzz1yN8b94NZLOLDkXBvPO795+eg8iPYQYP2Hu/rbQRrDHgRF/TckwFGykow/gqxRwAp+Bour16kzxbucPcLI3i0ZYNzLIGspwnlYnuwhlJv9W/0FtNUO0q0Jg5n8HxC3ofnKxoWYOgV9zeOu/SBdg5FvzbdXIG7puwad7I9LS64tlje0dipHoUkKlBSMGwzAXdm0jUmdfxnHhNIH6DXY5qG+vU7vBNw/86OZb3+o3+ugh4CY0HxO6Y98cPDCFnBpKZlWOV6fpkJ0rjWzThZsdkhLl+KpP0CNz7HgPDbaVS67sZzB9KzMZjX3/TU4BaUOO/FiRZ0a5rBSuDaP0201+4YcjFwxkUo5sA9wng7T8V963iUanxwX7imZ9lEndni3mBW6QscycUzYNb0CwSkpxuSULHuy8OlTpjmAm8RWByge9In2EsB0v4bOHIcDqfAdHBnqGD4SwkXsTyVVXKE+4uzyTjTjbHDk2nmbgRFkKF1MaLBBJlPA9+h/f5uijuHpRB4MCafL4r1tju4YICY/SSMkhAxxJ0FVXeR8DQtuo+7ThI46ofDnV9yyoCRu1Zf6V/FYQ02QSj2qnm0buCayEHej3F3uy+dZaLK00+9Pu6LuTaLuT8Oy7mAulitU8QdFhgqG6BdEC7bA2OCc75u6UcFbwbq294D97W7h1V7awrwOMHAuqFVzog/tMcMMuVapxGRnVCxy76l8qTDj6pXN1rLui2tcW/ct0VX2NxgrAwLb7S/Fb1DLdBsD2a5G3d0Hsjg8WhaXw5VrhlQqh3cBRY/b9rZ15ZxP9+E2W9C4RHuTw5T5dvERi8RTUUFed03HLMWqmBVOZMeNwuzlnBuyHvf53IP3C2qCP+HQ/BR+aFNvE0MZh3Dz843JNXu6CaYVCROe1sFjZlFzzOqZWK837JD/IAU3zA98TWZj9JYDtdKO1J7AirTUBsQsI+VpKr4sROEbKJvD/NeB8byGPdn9zH6yAtPJ8tQ1W3ffuwI9/9UPp4NjX5040Q0FnQXbDTUdnV/+Oo3a+JmqdeJY4X/3n15B9zhDva0F9ZEJRIukUxqAUHe2ZQV8BZ3mqHDg+Prxd9SpuVf+jExOrF0btkhfkiKvWmVMU7zm1Dud6BHiewO6RbVD9LOvVvDPWS3W5zWcmE9eKQrt8PmzDHutqFrWAjv3Iye8bpJPn2E+9z9PNC82Xvs6FbBDyp6VoBh2mCG49y2mxE9eJxUcYoPHuftcS9sE3Qth+OtG3hUrclnILw7zN+kT2ZardoU9xIHc8qkt6xb9T6QIdHBXd4Zd9urrTGu3Y+1nvWIzr4INOGtEJ31+oLDtytvmsDY9lVQB/dfZ/8yDfhPWHTApXJoP3aMOwL0dYE+Ir0XrPh9554OOEcG3hntinoiPZO3UmhW7HabJ2EPtJkRiKU2su9Guj3ucLT0riaj66hD49ZavGVxUCC+r7l8vekY93IS7s+r4HkZmqk+FO6zrShL7HhJIgRXbhDhNXkvSrqMj75v4pfc3WLgVKipGdFjIdX72Co+mqqyV/1lVjjiFClfNjI8R7hz+Id4BY66H1hbXD/Di8hw4WD9jMvD7Ogo3O3qO/is4SuP1fvNccc3Q/mTZtCtBU4Zn2hJVSMuRukYdz0tYmYl41z0JO6w0aMFHT4peeZz0Yan/hqf/352ud5bxudse/Bgo9mJm4mhXO8O7mBUM4grgLuHn5p8HeEObgoN4QrDW3rDFiakfNgPSY+TcFs2zd1xj/x+xUlPHNw9E19FcB1Roep5+I6LUR0wZtrj2G2/Oa0AUXTM7XC85fS/VZ3g3seZh5KNuMxUPlodlxBE8JZgPRoYdwYalKaRm3k7vQzeDlT9MAq/L2R/QeQI9+/FTOBTgJ9e7Uhxt+GdxPufuKZRB9JuGYY5D1Oxx8dA54ATuTnuOigJHdZpZxtmQ1Sb9Un+pPnxt2aCyzzFXeClN94adbc/rc0Fc1LbsXXxuS+BOoY7cOJxr+7vmqFlVXgpClpV9bgX37+zpyJdde2GnHK4IMWMFrr9I9Xi+DRoMLvhJw1vwzxqDvVLjk73CHcCKyHy6Wlw9z3c3RvkTi+2EEEJsTsi6kD3yP+VztYGTxuDOFpnLR2Ev7EK7FyCH4Hn0b1xNxQVgRWPfM199CZRCCe4IYNd36B6F2bCZLWHO3rdN3OKyAkzNqxWR2EXQ26bgDtVkhnEPah/5eyeu7bDKL55bQyF//Z7n5pN+mLf70CYKMbC+oc/TJNIaW9DlEsMy8Jrsg4WJgsVtRM5xv2rifb3dis6cTuvnZiZgDs9MNb+ucF4cLrD1aJVpo2Ok2zhl2NYGSIt20ggHm123S85cmvc42LfwfgJzzZENfsTpFEqYnNW3TQX+977uAvcEQa2Kl8sMg2g6y6fk8xlLFTtoB4YEx3rVatflm40vrx5XB8m3jNDAbCmk5ptQ+3f6JjpsArLk/6C+iu/xegZLSC+fTdHoIjBcF0xkOvokqS4u9ffdbCbRVQxGFOsuu7BFnekq7CvNK2z0YOKJ0Qkc88ofCocexL7q7yFBY4mZMg2d8fd+sovYCjSqB8MOtfJM6nhH37e1FCYiw1K5wJJcccADsPQAdGYZ275b5vdDsOVnBWluV9D7DcI+EfaPWPIVhH0F0x0kp3GATeXYu/NDzwZWmvwuC8aCgBu66d1JkMwVJiaAqoGxhnvHNOWlGQHE/W/CmXze76ZI9wFPU9xAT2J7yboB5eZsJmUMH4yTM8UjRGyeKd6HyiGnzHSiGyPa/HWCqvJ4Rm8G/7hg9X9u4d5e9x9HLGPxMQorgQUHcYW6zZv6aCv0e4wMr8a9VdpGmWHfGzw3GxwrI5mVRACFhrqhZXt7ifdsa4oZ5sayFg9Z2c2CukJzJyvmO3GdKWyUc2RdnfPNMhqi+ltPF3G101g2V9gvDJpxEQRtaRW/o7o+w9S3AX6CulqQpQdxXcP7r2L+zrQjgsv/lpxGxeMSrJ/NR4n3JYQpkCbcY5acz0jWwtDR74c3dmzm+P+YkPxcV+nlry4yUbg3qOZU+Od5RPCu45wFxhHt+Av9Nfff//jj2KXHPuaUiCOeC8T7a7U4G5MvfLTVdikqtz5DhS1PipxPfAWxWK5R831pciY6Rszp+KFQKt889fThLHTnRtvHVSQDpfCNMft6VPcudsQWdK+D9q4d6aD+85aut8crv/VIgFcKxMi/exMvOIKsIYpabIeJmKQNywwgXYq7o77NkTiAu6hRm/nkFj7KJIKd2Avj1VPcIcrp+ERSiMDsUpOnrEDe3sdtuh26FJRxXgZQHnIr85MJam7gayrNFH7TVm1rVg7RZvM4APoEhnA/dTTMRYd003I7+kDEDQPuP+CsjoKJ09xn8/pCGDPb3QJ6eDO8JptMYDn6Bg9AWAp/WaDeaC6WLSzEAgy2Pgh6B7mjXGHacQr/tLUoU7tkRloVfQUUGmusqdK3pQU97/BPxVOdkKwUugekGTuHEwvdcHUvn0B4v7XwG52QlGnpmUo8K7kJdD3BeZbA8kXFwhr8ysI9+eT0aA8vSvWs6QbQuc7PRTA7zNtpLobpbgvFjj4R67Isd23nhlrnkiXYx7f0eWkc6FwhBnop15kJkbJ7Gd+mRjJ6dULvBPuhfUXRfRGF25buDeLUCyDN/LSOILUmHEv+wYmB7zNDw5BmDI6PlGFdJ2Ji5i74YAvBxsJMENbLH8hzH3/6/A7dUaF6OEqCZ3H/qvuHVX5TeMfsY/lqY6pZ0isb53gfmLJV/vNYkZAdL90vtNDEWixYeaVXLWAOwwsjOkcVqPeum6JZ8bnH1kjB7ycHqSDDA9hMXATh/hZBjGIDMm5M+7a0w278WsbzdFhH+AptZl1Z7UXzlVTzwx8A3fa4uBAwpgiqPBh3f97cr2b6MuNriyUTYWzUMRwJcthLyMP3R9DHHDbxL2V1r9TR+RjXki3zw29c03wPLpPUtytT3EZluCkZh6fnR2KZw/jyXysHdrJnZsyxZ2+oOxHvgyMX7vM5JfY7UDB4ljEGz2PdLimn60kvG+JhSJad8fd+ogvFtyMi6Y5yuDYggkG2be6dRU003H3n8S0L2vL9HC2vCTnGHrdCiiInrgkjnAfron3RcvYP6nL9pClEvs7RfKlrFN3p78X1LTi3HSiA7ifqABc+kFee9dBAcq1t3ew1f+brmjQnydxd3/aWHNG9EcHdzhrNGF7theGjM/oXkArajBXK7yJPpuHwT1m04V8+SOWw4yjbHG/1BPZ4v5KTt75AnxWfYggm91d3xB9qZInDTsHd7DKwHCpiPej3qryBO6yi3u8U/yCyWTeL8RdN8nlnI09SkWDcegR941ujqqydXC3s3NXw1Pc/XPD7aLnkLUJ7j5TdSgPItwDOprBd/bMrPu494Iig5INuG+n4142OLOarVX7FQXDcNjAE9q6dOkw2iJy9mvVmiYrOdqlurAqMUU63cP6uKf5TzEiJ7Fjoor/czLvF+JuWtyRjP0w7uDd2SWXolfZoWO7l363b/uPO7Y7tmaG7+mNNW/CnCFMIgZrfqbzD3RN9LxtD4o79wfrcVeTcW9MqfUiZE0ygeEbVCLLx4bx55DVyDvHK6plgu+4b6PQVUL7mGo/pv9oW5lod9xwchXTCbgXsxb3Ee1ufLqTlcFF08nBO4qZidr9zaNNgwjix/r7n3urBPxnNK87ibt+YNx7IQKAu561uK+n485D1hjRzlVAHQNlmoVfdG6otza4i1ofkIZw9zipPLFQU3Bs3bQ8abi/YdQnpozfeGrE2UTcbVzMHnJbshT3wl/icdzx6pnhSi9d6eAO5lI5WP+KNarFfecPtz9ANuKuHgZ3+abt3nRxZ9ONmf/2nkccd2uVj6CyGDYVo5ViQINOEwL2MsH9dNUkVmG2cI/hhOZj+33w3mhbY8t6QuUEOpZLcTcR9+2MdEt/68Lx09Hup3EPXvdLcPcZgYD7UPApzaoOcLgOus3ghBrXDvA6Pgru4pypaqvdmytxX5Mhg9EDwpdcwwrDXxjXlNcIOwjrtvgAfgmHGnBfQdvg07YFVhwaUNlD8I9p98Qawl8X0wIsJ+D+BfwoMsRlD67puWuyIJuZwrL127g359TZ7uEOi2L94FQ4KeqITLhDTTt7CnfzGLj3HJGDnhm/knA97rNZPEKM6+uExWA9lXguYcKkQuLYV8Kd6FPzN/bI5uWiqjtz1culY8hPtGYmGDNfvLr0i6pDhfCD+0D7a3Iad9ryQtxpZQhw75844OIbgLe4f+9t9oi4e4+WoYeoMb2pqvLLPe+Ce3s5wHTpLkx8beMVlA99Mk2cJsyj21CeWVcDoiHfChA7ETpmmnq1ir7PSr1tCgwexMW4g5p8CQ3MeDOYxW5C0q83MMWxi+9q7e7nnmUziLs3SIPt/jJizETbvXkM3CElC9Pgt1uBJfPWoo0H3TFtrEB3YFgn9qGpl+J+cNqIb3YbJ7sdvMxxXa6fPu9TkQP3wmsRPBvAfbWiBaFzU/O+MDZPhZ0vT3NTr5YqdCy+Ge44tlDhBAv3QjeEAYdKSDrwIbjoGex8aa8kalgkPC1JzAw9VQD3AWOmoVivFnc/5ejKQrbxPz7g/b64j8s2FEmjWqmwBzUZd0tFDihrCTOXIFi0t3qxjTF0MYGhnasS7n79U71ctP9p8kVXy6DdIc5mWt/ji7W7X3enBmbPw8Uhghc94M4y7tNxXx90qATkSxJi44TpuOsmVjekxEB4YAwkT5R+giRa7R5DnxaxRzDgftn+JworpW9DD2bUtMiZy3EHjp5Cvz57Ju7HfpeM+5m4bzGcvwn5XfrV+lR1Ph13YeL3xfoRQwcSzp7BM/1l1lktNNG9cjPc4YmCe1RQ0Kma1M1hGu4QQDG27Be+JMR9+f4QGffLcReC7Beq8spFmu7J5WTc/7kmSUr4DxYM1z56GneB7ud2tc7E9R9Zyeqy/U+VLu430O6s1e7mLdxpJtni3gEp4/427jyW3LC8V/S+KKWaivu5EmPoQiE/cOl4n2MH92nTxoul9M8TNGamVa55B9wHPDMp7jgWGfcLcS981zTIKEpVb8Egjdia1zZD8cNwZ2FRehGWTxqVGjMx7OtGuFd+lxCbVt9iqsp8ZCHY7oS7PIm7NhH3bmhLxv007oK8J6bUidOD8bScjgxVfD4M95eAu/bJlxBYrf0J02o+OQZvg7swsW4Z7HNSYYLJuBv0Po3groN2z7hHuQD3NTUSTBKRtyKUaguzzObjtfsmRNhBlhVo9wR3RbhTyNZtCp463IPfXU69xabjXmE28/m4d9zzGfcTuFP5p1jom9kyuiHdLwsolcMgveLDcbe0ho64Yy2iiDtTdRugKN+KIXifo9E14i6XcJtN3OfluJPt7vl5A3fe4m6ydj8Td2c6qBhnyn6leo3UHBAaT/nzCOkdH6rdjTdmIu4hhGdN00XEfXUb3Lnp4H6LmJlLcc/GTCtn4o4dnkMdceyViSUBrBDbzhno5g64x6IsXMWQ3DMixN5FeFNLFZ39E32fk3E/OVVdeNxt1u5Rzm5WE8PK5zoUnu7kTM/+wEO7Ce5mBHer6lBXSd6mBfxGh8xs/DlxdjwVd9OcckQumuyInIY7VMnzaRWa9Hq3PQqUxcCyOrfCnYbhGHdd1VUMR78J7nNDuFMVj6nZe++A+8Bgh1TSEESQcT+3nUHIOZ+JPSyoqrblCKNEUrgBrsP9uw+z3IY2RFshBldVT+AuZB1KgilZ3cIzo4PtBPudXC7+8ohIuBhP4bLbMdxpoDLurZyDu8B6tO5IdyWZMf6Z/QLhBCb0mfQ1Uafi7r5qD2U+96F2/r7T7q2VFvemxZ0GqKRpI+KubtEkeG588jbqeDW1OOp03GOImBnaTEXcCaSM+zm5qja0RoGImJhwgUWn2+aqZn8d7qGIs/ARHl/NSG71oHanLXXEvXK4P52768nytKgkFkmlgpMTWqeRTIt3f7E+IrIcw50wSSMiM+5v4n4IxcOhBrVsSlxRFW1rJm2/gjlp/j27CvdQoNmn5hTNSFXQl4C7PYE7lHr88D5jm/LPCgLD3KislrKuJnc2uxR3E3E3J9I7QsGImN5xXO004z6AO5Suo3SC10b5BR0o5AX9rqw34rFKIWjT6biHKhKhvE5hRoqqPo3jXqbaXe/O3fVE2fE/yZTxNVXV5MnCRO0eWmb1C2+hLJytQyl59GW9HhOfBPcy1nQNsYHDS0OoB0OW4mTcBaT4srA7PBJusZdK0v/OuhvhKRna6bi/voV7WvdW8Vl7g0C0VgW0V2BHS3PunifKjidp2UD89MnCtDozndTsoUoETjv9NWvnOL1Chp8Fd2+UPZ+PO0WX8Cm466TLD1UAZthYQyd+kx1YNi+ztEjHpbiH9djXWG94xJhZR9zdBNqnujcBd1TuwPyH476bG1+VyZckmK7cJ+K+SwpvDGwNAdI4f3EXEGnUPz7uKtbjnYr711DpwoZ+WVtcte8MC+JOYVvX4A672Xvct2O4x0Ky4C8KZ0dHk+JeLy7a/aWyAY/7L0mRVPlmoehxuaKKmMd9wCkELUFK6hDTllX6rLibWceYkSO4S18dajruETsTnI02NK9p5QtUqiLczRW4w5jtYwXPN3DHGQvNoMPZJ7jL+kPjf/9dVint4JbZTv+2qbirUzUiodgS5vpa5VejTtaZeWDczXm4r0OPa6g9PBX34CD8Fjo08IG9beE9wl1NxD0MtX0Ld4xhmCUTdO0b5MxYwP2jszsYX1RSJZrd7VD8fsX3XYa7DVMxRZd3uAIwWPRYlzf0KwM6OysZPxjuPLRygR1Nxd0mTRj86o7qRWho/8cX01yLO8yMaTDVcDVaG3F3uwjeIBxtwF3GqeqH4c7EgjpFtc08pFpcs6g1FffTBa+VDAWv29Z7n9ERKfwFt77kxCncCWGP+wTPDEaXr2ftExOa6PTM1PDHJ1jJm7iq6iPlYd6FSilUUzuWkIvWVrgNGxLuFeH+QQGRO6fZ/6ypU2U0ZZS6rtv8xbjLWET/RDsD3/KB+cnQpldf/fPgjocZFG5hhts6ln7Fhl+Be4wytd7/Earkd0egicW5J+Ou6JNFbBduhgPvRXTthwR7P2CztccdckY/BPeCzcsqqe2hvHZXkyu7k1yKu088CIWuh9Vd61ELHSfHm9U8NO7czwd5KCikB3FHynHlppmO+7z1g9CGfKAPT7zf9HTcy9CZM3R3FqYZdLxbSSezVqFxZ6jBz1PcJ2ZajApbl2XpjJgKKUfgl8uA/ZWG06W4Jx45GOSdHmpFFvw2vOmXnyL5JLjPU9xDF9M+GcIf1hbcJlNxF2ENM4aTKvLydPfUqFDyZTLu7pLHsRez0Va6X4+L5rXtC7nCRc4K1zmbq3DfbH57+mvOgXCzcD81dXaNa0qo4ZdL6O60Wsk0U32KXNqbyW82Dx2mtelf/0i39dHwpxpNPjTuLK7E+JITvNfXd+YL9hIPofTxBNyDH2QWqrqUsr+EF66OeG18X871xbhjb9wv/ry3M18lrL/d2vheiNaXPGx76JY+gMD998uFbvfN2prXVz3nvNSLBfUtxh6r7v+0P1PSo4Zq/larWl7VU5Uu1UW4z4EzPGETHO/9bjGxgwyoh5LGSR4bxZ8C91ja3PoerDyo3kSK0HBn7c42VPq+HHfe4h6KIvdw1zHw2paSwnf/dTHuMVkBrtOBzm5o8IU/Z/gzvbojJndySQ1+L8ad8efnKvadDDE3qtvcw/fbS+u5OyW/Wi3V1bRfijuDluyhS4zXe8fq/aVt9xCWRHrD+Ulw/58Ud+0vfUgkjUPSxLgwDjGzE7U7i7ib0K5KHWkSFjzy2vDffEuyy3FPXUC0Awh96H2HMO0MzC9/hQCpXSlb7S7Pxf23uQZn/Wq5XC2p2arqtyjr4N623XO0r5Se1rGjO4IX4T6LSyCNZwV0QBelQ2jELVTQ8r04wk+Cu03MV0WnixPJ9mSw9Wig3RYbOxn3l9C8Wyvp3UFH7TGxbQx6vKx6efJROv+cUgE4elxiwGrvQQLdZsluC23o13GNd1fWl+POK2WqkO6Ha1RVhb0qV6u6VeZ16JJQy6TLZA09cd4jZ+pS3LVvHsFC0B4s83Xm9VsI+SCVKEPvFflJcV+HpjgzE7wThLfg62LDBFQKgDUG2OTXhdvyCtx31s8PonMX/TztFlucUlLveI5DEVzCF+IuYvsx3zecJledaXGhg2KLfbja/tybFvf6F3lmpqrGqWfIgToh8gh39zRwZvuVHshAxoW4W6N8DLRPmP8DH3ptgCqPPX3AkRbdc0cO5E+C+06HvBQbrvXaUtEjE+rXud++0iFZskimBgDD0MK+9u0AQuKFP24mXo23ozh8HkYwrgFdds3XrVb3j12GFy2pu7qmDszpqhd6ikivBdypDsbbuO/wbBT6zz3TzhRfHncH7rYf6/RxUt1aDJPlUtxZCHWNsyY3MtBARYhi4/QdKAVv4VmV2LtH3ptPgjuOBpm3cY7CLPYdhdpHVOyIDlujIt4aORl34f3s25CeXViKiCxeNmsNxR1Iqwjck5gcM9NOTaGxJRG8NYj3Yf2yeXnhtsQUcOszWcOqlAqXkVUhK/ss3F80BlCVbT/JX1rIZbep6kDXMbAn3iv5+1Lco48CrgWdKTxkZSiPD6nDr77/rKH24rAYfhzF9llw52F6hp4/stnBlRZFC1Tt7h4IAcCTcf8awMUAYEYja3yjU+xAgA1l1uba3kx0E1NUgB/+2SE5J7qKZDfhZaRME0fKKw3ivEpUsHor3J1pVYOhxFRoX1apxNV4PE9tg8H8r0pPzUwdOJZLcYdZvJ/XG2qnPCsEVuiUirQdJRSzWGEtBI13vuWT4I6OJzwuKGUXbLbd9gBVK4SwjJImhW6Cz06ar7PJuKtgxPhrsNXYu4OUCSlbZsIcYjru0ZrBYyCsqQyrE3xoQd94T3sIC9MqBqzxS3BnC2fzLMicoaUjbOrU8UYGj0xbmoy+Hmz9kr9jKuzFuDMTjRWH+/7/0JvWeu2gfU4lPPKbV5rlyX5Tvc+CO5Y5snTV5FFiUSsHMuz/o+0IOCl5L6xQv0BiHkWQbjgNrBtfOk3Q7ZvZt7Zf+KSySiZUKiuTVpZMa38RrQ45JYc4YRXhZoRPVYnL5I0W9VBeb0WL/4WSy5WEhdhot3dwP7bc4cEm3sdmj2Rciju6sUwRrtdAxzY8SRudtDBi9p9Hf/88uLsDfI2PK0iR7n2P2NMqmnaPtTChmZir6l1/cxPWTI9k6+ZD+ovT7FtMAp9cRUzEq4OxnqPpQc6Ea3wIoE2i4udtlKLD/aTtzp6rtlsZV6qSFer1iLaKIkMBbfLKgMOLXRkz0D+ci3GPS+a4Gt0cd58FKciaJ0+G+95+9sCnwX3dVr0FR4nTOF02uA4JdhysgqtwZwmE4MztDSye/hdw8L9c0yR+loTJMKzSN/zUOsBl9MpbmMQpylKH+El/eOFMIIj1ouIBzIIlU8X1JUnhXxgRE3pIBvhLzj6gnsfluM9aj+wWi+q7Z1/agvZfQlBxQyIHo6Z62uPT4I6Gile0WPVI4fzUai60FiVcOXfgBY6F4/sq3Glk8XQ4NmVKW4/9zoSDZCHQJ2OpBsR03EUMhmA6zLlZOkLF9kAet9Jvr5K4mrn0i59YDOPEZduUULIAF5OeccVKwfIoYA1rS4T7arVMwtlVVZbOgvmoqpMTcIcnqo/6ZfArzmzctRcC4tqsCZU82ys4GEP4SXDfJop2aym5JvihsISd0cmC/HW4s9dQRewlPEoE3lZrQWY1OOT8nq7Dna5LVNx+dmph+s2Tq9i0VzF9rEXc0Ro5YV1zKg1TQX93ONhNqRB3WmxCTQ4NGhYahPM5106nf2SRpgm448JDGIgSvdBUbx+FyhgaX2STVkqGvuKz4A6uKEl16mazL1ssX4dnaPBaWezpC5mjeFdfhzsZMXgIOzcjUO2dJYn9GU5RcZMrcWetuTnDrmd44UKrYvwXWFboZaV7I1FaPJ1ZnsCdLWrq6w7t5Gk9yw1bBV0ZtHY/oE188eXquK+LTvty3AnicPprehp6NU8tQENFWVx0sgPn84lwJzd4VG2/6n3wXzj5RmdjocgdXM8rcWdYRcl3sLa+lYHbDCwJdM0UFivP8Ktxx4lCXEjdYuenJmmJg1exCBdLdh/R5Zm46zoocih4h2bRt3d2tVx81hNwLyhURH/1/xZMCF2W+EhyT9+wGWiNYIweyWfCfY1ephNVON3fLdMYPnUl7uS/NSH0b0s2jHUzhXUYNtzT7HrcaRKeVLFxF9Gp3BJa4pTOokkPyRz5iTq4m9E4RazaGzp8TG38+74yCXdcWMJV5hNnwCDzw4EwRPunwt2Z7E2vrUB6ms6mLgoavmtxxyVqdxQRrgLE/w6ruYtiY45xV5Nwh2cSFn1cn9rIz2Rt52YvQ8DMadx9vw23IZo058aSfaRMw93Pb+TYOkCxFr4L7khEfgd3DME5G3ffhfti3PvHeS7u6MeQ6L04OhsGna0V7GtN53M17uTdHVjPYkhniUeJiSZXOSLpKtEkbKgpt98luCLRxu+M8aZMV/7V2NfPjW8s41uImZP31W2EBXNj4fPrbAgNeEOENiE0UKzdtJqxl83mxV1/9+S1lq6ZsWNJ6iLkN4V6RFqeE+LJfSj4LJRktYPGEnOXqJy1SYMj9TKs5037mnB8rL4QhQVJ77xwtgV0jBFbTQbvs8XvwI/CpGYEd+2DjWysqzFcxINC0IzZC8tf4Ct2jnRhY3cDvyfuy28yM5Caca5QW2K6iBr7V242myfG3TlyHUM+jx/QG62qSPtqNFm6DE21CfdHoB3LOeLpQBzXbJZWeX1LtmDRtHMbR4EuqcOtf8uK0Ul3zO8L+ZJWnrNbHgtf+YLbI7inobSzcdyNCcUSY3yXGN0zchHmcf48waDD0WM+wW3vtqHY8F7Ms/ahQ/uo3Y20gwMkTJwuOuYs3VXg8cRTsIR7CBH76jbbzyaLsMa7YcjJ4LRVchGHr+LGpEHrY7gz7OVOyDvcF+8V1HiVFNbaAyYuWouj9nf3xrlF+NZBBeASgXdC+jgxa0/dzduDL1j+zdpv32n3Z+wWPrb1H/uv8Y9tLX373/fu5NzrH+5j3/pkpae89h8bPYYCYwaT1UByVQs6y+03+ug3q/E1HEF3b3RQ/rU49DYJwgKEMjTsSKj7Rh/b7mmP3+3o15wnLPRLaNARGVYW/FUcslWfWtzleA88ntT/Uu+Ti/QAgk8+0xH3sF9fUbbyYWVN8VqNCZ46/mHP52JdpgP6gXvCExu4iAYWjoc3fzJt171x3HVa7u4h3DLvJLtN4cZLbLdbsRdz9rL76G4O9zvTl0K4ExViv+dPH9yiZePGlDsRHxI80j81N/FiHJ44+/3B7fL/jm/6l4oRkQ7nEbXN0yfh6FZZsjy6zFWVZNaNgMzSMDDqr5MlyycULKqEXWPqE9o9Ve7NA7jcs2SZJKWi4hmI+1hB1JLSTMmAn9wYMkuWe0tZBdwhkH14qrorlxQ8ABHtk5tcZ8lyd0mqzFTViIeRJbPZhwgfyJJlmpRtCcdR3LmKOad19stk+cSShMw43P8a3IaZpLKGnBzlkCXLvaWL+7CLkamkkszEkM0sWR5Ayk4dgd8Gt+EqqYb3PvUds2S5hywS7a7U8JIvl8uo3uvsmMnyecWkuFfDuOsE9+yHzPJ5RXRwLwdx3zncQ3n2UwlPWbI8uBQGm+4F3P82tM2XRb2Mddoz7lk+rxSmjXZXI7gzUy9DVnZeZcryiYVc6r7CnRGDuM9N3XYq+FFSO7L8jNLiDp7IQc3NdFXHLpE5QCzLJ5YiLpjW9UiEGG9rWruNFhn3LJ9Wvi5CrwGYq5YDNamh8ulSRdzfoUFkliz3kkVN3QaoejU/TtXcYHgY1mvH/sB/5plqlk8smor/Ymt3Z6rMu553VmL8gLsXfDvsvMiU5TMLpzYbVYW4142OTTZ2BeML5aNpYAMoqpeVe5bPLNxQ/FflBLNWjS7Lf/zjH2VZLhZV5RsryRr//BC18rJkmSy/Jb2vsTcHNaDxLZd8F47l0uOub1E2JEuWDxOulqu6/pNsloockrHhkpLLSsZ7ofqB6ill+TmleF6t6sXC8wz/V9ETD9ivYjR8ZebX7y5LlrsKxw5j+ANYJ9wT+4acNtkJmeWHEKYr8kJ63T6Eu7PvV7XOpkyWzy/MoKmuUtwr38LGT1t/Cb3hs2T57EKFNch27yh36VefoHFqpj3LDyK8qYPpnvglaarqf9W3bCGZJctHytwYVOyqa7p7P3xVPUa7jixZ3keYNhXZ6Snu9OtYn8IsWT6rPPHon5Ed2CV2s8+S5ceSL3Pqv6j+X5ymOs2+0Cxb7Vl+RNkwXi7aFm1Kac5zkEyWH1kEE0I7ESwb7Fl+LPn/YvMSI/ix7DYAAAAASUVORK5CYII=";

// ── Home Page ────────────────────────────────────────────
function HomePage({ currentUser, onNavigate, onChangeName }) {
  const [nextRace, setNextRace] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const today = new Date().toISOString().split("T")[0];
        const [{ data: raceData }, { data: latestScore }] = await Promise.all([
          supabase.from("races").select("*").gte("race_date", today).order("race_date", { ascending: true }).limit(1).single(),
          supabase.from("scores").select("calculated_at").order("calculated_at", { ascending: false }).limit(1).maybeSingle()
        ]);
        if (raceData) setNextRace(raceData);
        if (latestScore?.calculated_at) setLastUpdated(latestScore.calculated_at);
        if (raceData && currentUser) {
          const { data: player } = await supabase.from("players").select("id").eq("name", currentUser).single();
          if (player) { const { data: existing } = await supabase.from("picks").select("id").eq("player_id", player.id).eq("race_id", raceData.id).maybeSingle(); if (existing) setHasSubmitted(true); }
        }
      } catch (e) { /* silent */ }
    }
    load();
  }, [currentUser]);

  const links = [
    { id: "practice", label: "Practice Picks", desc: "Try the pick process — nothing saved", icon: "🏎️" },
    { id: "results", label: "Race Results", desc: "Detailed scoring breakdowns", icon: "📊" },
    { id: "rules", label: "Rules", desc: "Complete scoring & format guide", icon: "📋" },
    { id: "strategy", label: "Strategy", desc: "Pit stop & BOX BOX tactics", icon: "🎯" },
    { id: "players", label: "Players", desc: "All players & team rosters", icon: "🏅" },
    { id: "f1-calendar", label: "F1 Calendar", desc: "Full 2026 race schedule", icon: "🗓️" },
    { id: "admin", label: "Admin", desc: "Score races & manage data", icon: "⚙️" },
  ];

  const raceName = nextRace ? nextRace.race_name : "—";
  const raceRound = nextRace ? `Round ${nextRace.round}` : "";
  const raceDate = nextRace ? new Date(nextRace.race_date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" }) : "";
  const pickDeadline = nextRace?.pick_deadline ? new Date(nextRace.pick_deadline).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }) : null;

  return (
    <div style={{ padding: "20px 20px 100px" }}>
      {lastUpdated && (
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: TEXT2, textAlign: "center", marginBottom: 16 }}>
          Last updated {new Date(lastUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
        </p>
      )}
      <button onClick={onChangeName} style={{ width: "100%", padding: "14px 16px", borderRadius: 14, border: `2px solid ${BLUE}`, background: `${BLUE}08`, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", marginBottom: 20 }}>
        <div>
          <p style={{ fontFamily: "'Geologica', sans-serif", fontWeight: 300, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: TEXT2, margin: "0 0 4px" }}>Viewing as</p>
          <p style={{ fontFamily: "'Geologica', sans-serif", fontWeight: 900, fontSize: 20, color: DARK, margin: 0 }}>{currentUser}</p>
        </div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, color: BLUE, background: `${BLUE}15`, padding: "6px 12px", borderRadius: 8 }}>Change</div>
      </button>
      <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${BORDER}`, padding: 20, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <p style={{ fontFamily: "'Geologica', sans-serif", fontWeight: 800, fontSize: 10, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 4px" }}>Next Race</p>
            <p style={{ fontFamily: "'Geologica', sans-serif", fontWeight: 900, fontSize: 18, color: DARK, margin: 0 }}>{raceName}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: TEXT2, margin: "0 0 2px" }}>{raceRound}</p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: BLUE, fontWeight: 600, margin: 0 }}>{raceDate}</p>
          </div>
        </div>
        {hasSubmitted ? (
          <div style={{ width: "100%", padding: "12px 0", borderRadius: 12, background: `${GREEN}15`, textAlign: "center", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, color: GREEN }}>✓ Picks Submitted</div>
        ) : (
          <button onClick={() => onNavigate("picks")} style={{ width: "100%", padding: "12px 0", borderRadius: 12, border: "none", background: BLUE, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, color: "#fff", cursor: "pointer" }}>Make Your Picks →</button>
        )}
        {pickDeadline && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: TEXT2, textAlign: "center", marginTop: 10 }}>⏰ Picks due by <span style={{ fontWeight: 600, color: DARK }}>{pickDeadline}</span></p>}
      </div>
      {/* Three main nav boxes */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[
          { id: "player-standings", label: "Player\nStandings", icon: "🏆" },
          { id: "team-standings", label: "Team\nStandings", icon: "🏁" },
          { id: "schedule", label: "Schedule", icon: "📅" },
        ].map(b => (
          <button key={b.id} onClick={() => onNavigate(b.id)} style={{
            flex: 1, padding: "16px 8px", borderRadius: 14,
            border: `1px solid ${BORDER}`, background: "#fff",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 6, cursor: "pointer", textAlign: "center"
          }}>
            <span style={{ fontSize: 22 }}>{b.icon}</span>
            <span style={{ fontFamily: "'Geologica', sans-serif", fontWeight: 700, fontSize: 11, color: DARK, lineHeight: 1.2, whiteSpace: "pre-line" }}>{b.label}</span>
          </button>
        ))}
      </div>

      <p style={{ fontFamily: "'Geologica', sans-serif", fontWeight: 800, fontSize: 10, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>Quick Links</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {links.map(link => (
          <button key={link.id} onClick={() => onNavigate(link.id)} style={{ width: "100%", padding: "14px 16px", borderRadius: 14, border: `1px solid ${BORDER}`, background: "#fff", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", textAlign: "left" }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: `${BLUE}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span style={{ fontSize: 18 }}>{link.icon}</span></div>
            <div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, color: TEXT, margin: "0 0 2px" }}>{link.label}</p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11.5, color: TEXT2, margin: 0 }}>{link.desc}</p>
            </div>
            <span style={{ marginLeft: "auto", color: BORDER, fontSize: 16 }}>›</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── My Picks Page wrapper ────────────────────────────────
function MyPicksPage({ currentUser, onNavigate }) {
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [nextRace, setNextRace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pastDeadline, setPastDeadline] = useState(false);
  const [allPicks, setAllPicks] = useState([]);
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState([]);

  useEffect(() => {
    async function check() {
      try {
        const today = new Date().toISOString().split("T")[0];
        const { data: raceData } = await supabase.from("races").select("*").gte("race_date", today).order("race_date", { ascending: true }).limit(1).single();
        if (raceData) setNextRace(raceData);
        if (raceData?.pick_deadline && new Date() >= new Date(raceData.pick_deadline)) setPastDeadline(true);
        if (raceData && currentUser) {
          const { data: player } = await supabase.from("players").select("id").eq("name", currentUser).single();
          if (player) { const { data: existing } = await supabase.from("picks").select("id").eq("player_id", player.id).eq("race_id", raceData.id).maybeSingle(); if (existing) setHasSubmitted(true); }
        }
        if (raceData?.pick_deadline && new Date() >= new Date(raceData.pick_deadline)) {
          const [{ data: p }, { data: pl }, { data: sc }] = await Promise.all([supabase.from("picks").select("*").eq("race_id", raceData.id), supabase.from("players").select("id, name"), supabase.from("scores").select("*").eq("race_id", raceData.id)]);
          setAllPicks(p || []); setPlayers(pl || []); setScores(sc || []);
        }
      } catch (e) { /* silent */ }
      setLoading(false);
    }
    check();
  }, [currentUser]);

  if (loading) return <div style={{ padding: "60px 20px", textAlign: "center" }}><p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: TEXT2 }}>Loading…</p></div>;

  // PAST DEADLINE → show all picks + season history
  if (pastDeadline && nextRace) {
    const playerMap = {}; players.forEach(p => { playerMap[p.id] = p.name; });
    const scoreMap = {}; scores.forEach(s => { scoreMap[s.player_id] = s; });
    const sorted = [...allPicks].sort((a, b) => { const an = playerMap[a.player_id] || "", bn = playerMap[b.player_id] || ""; if (an === currentUser) return -1; if (bn === currentUser) return 1; return an.localeCompare(bn); });
    return (
      <div style={{ padding: "20px 20px 100px" }}>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: BLUE, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 2px" }}>Round {nextRace.round}</p>
        <p style={{ fontFamily: "'Geologica', sans-serif", fontWeight: 900, fontSize: 22, color: DARK, textTransform: "uppercase", margin: "0 0 4px" }}>{nextRace.race_name}</p>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: TEXT2, marginBottom: 20 }}>🔒 Picks locked — {allPicks.length} submitted</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
          {sorted.map(pick => {
            const name = playerMap[pick.player_id] || "Unknown"; const isMe = name === currentUser; const score = scoreMap[pick.player_id];
            const totalPts = score ? (score.top_pick_pts||0)+(score.midfield_pts||0)+(score.order_bonus||0)+(score.best_finish_bonus||0)+(score.pit_individual_pts||0) : null;
            return (
              <div key={pick.id} style={{ padding: "12px 14px", borderRadius: 12, border: `1px solid ${isMe ? BLUE : BORDER}`, background: isMe ? `${BLUE}08` : "#fff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div><p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, color: isMe ? BLUEDARK : DARK, margin: 0 }}>{name}{isMe ? " (you)" : ""}</p>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: TEXT2, margin: "2px 0 0" }}>Top: {pick.top_pick||"—"} · Pit: {pick.pit_guess ? `${Number(pick.pit_guess).toFixed(1)}s` : "—"}</p></div>
                  {totalPts !== null ? <span style={{ fontFamily: "'Geologica', sans-serif", fontWeight: 900, fontSize: 20, color: DARK }}>{totalPts}<span style={{ fontSize: 9, color: TEXT2 }}> pts</span></span> : <span style={{ color: BORDER }}>—</span>}
                </div>
              </div>
            );
          })}
        </div>
        <PickHistory currentUser={currentUser} />
      </div>
    );
  }

  // SUBMITTED (before deadline)
  if (hasSubmitted) {
    const dl = nextRace?.pick_deadline ? new Date(nextRace.pick_deadline).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }) : null;
    return (
      <div style={{ padding: "20px 20px 100px" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏁</div>
          <p style={{ fontFamily: "'Geologica', sans-serif", fontWeight: 900, fontSize: 20, color: DARK, textTransform: "uppercase", marginBottom: 6 }}>Picks Locked In</p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: TEXT2, marginBottom: 16 }}>{nextRace?.race_name} — Round {nextRace?.round}</p>
          <div style={{ maxWidth: 320, margin: "0 auto", padding: "14px 0", borderRadius: 12, background: `${GREEN}15`, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 15, color: GREEN }}>✓ Picks Submitted</div>
          {dl && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: TEXT2, marginTop: 16 }}>Everyone's picks visible after:<br/><span style={{ fontWeight: 600, color: DARK }}>{dl}</span></p>}
        </div>
        <PickHistory currentUser={currentUser} />
      </div>
    );
  }

  // NOT SUBMITTED → pick wizard
  const dl2 = nextRace?.pick_deadline ? new Date(nextRace.pick_deadline).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }) : null;
  return (
    <div>
      <div style={{ padding: "10px 20px", background: `${BLUE}10`, borderBottom: `1px solid ${BLUE}25`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: DARK, margin: 0 }}>Picking as <span style={{ fontWeight: 600 }}>{currentUser}</span></p>
        {dl2 && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: TEXT2, margin: 0 }}>⏰ {dl2}</p>}
      </div>
      <MyPicks currentUser={currentUser} onNavigate={onNavigate} />
    </div>
  );
}

// ── Welcome Screen ───────────────────────────────────────
const ALL_PLAYERS = ["Aditya Satish","Alicia Cho","Andrew Ishak","Andy Thompson","Anthony Carnesecca","Anthony Zamary","Brett Dillon","Brian Dong","Chris Fondacaro","Chris Malek","Dan Patry","Danny Bowers","Evie Ishak","Francisco Soldavini","George Fahmy","Grant Wong","Harold Gutmann","Heather Ishak","Jack Civitts","Joe Hanna","Joe McGlynn","Kerolos Nakhla","Kevin Coolidge","Krista Nabil","Larry Noel","Lucia Thompson","Maggie Ball","Maggie Mudge","Martin Nobar","Matilda Luton","Matteo Thompson","Max Reisinger","Mena Yousef","Moses Abdelshaid","Nick Brody","Paul Kohli","Pavly Attalah","Rafik Zarifa","Ramy Stephanos","Ronnie Nobar","Ryan Kohli","Sam Bottoms","Scott Schertler","Stacy Michaelsen","Theo Ishak","TJ Donato","Zack Girgis"];

function WelcomeScreen({ onSelect }) {
  const [search, setSearch] = useState("");
  const filtered = ALL_PLAYERS.filter(p => p.toLowerCase().includes(search.toLowerCase()));
  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Geologica:wght@300;400;700;900&family=DM+Sans:wght@300;400;500;600;700&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; } body { background: ${DARK}; }`}</style>
      <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: DARK, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "48px 24px 32px", textAlign: "center" }}>
          <img src={LOGO_B64} alt="Formula 5" style={{ height: 120, objectFit: "contain", marginBottom: 16, filter: "brightness(0) invert(1)" }} />
          <div style={{ fontFamily: "'Geologica', sans-serif", fontWeight: 900, fontSize: 38, textTransform: "uppercase", color: "#fff", lineHeight: 1 }}>Who are<br/><span style={{ color: BLUE }}>you?</span></div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 300, fontSize: 14, color: "rgba(255,255,255,0.4)", marginTop: 10 }}>Pick your name to get started</div>
        </div>
        <div style={{ flex: 1, background: BG, borderRadius: "24px 24px 0 0", padding: "24px 20px 40px" }}>
          <p style={{ fontFamily: "'Geologica', sans-serif", fontWeight: 300, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: TEXT2, marginBottom: 12 }}>Select your name</p>
          <input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} autoFocus style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: `1px solid ${BORDER}`, background: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: TEXT, marginBottom: 14, outline: "none", boxSizing: "border-box" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 420, overflowY: "auto" }}>
            {filtered.map(name => <button key={name} onClick={() => onSelect(name)} style={{ width: "100%", padding: "14px 16px", borderRadius: 12, border: `1px solid ${BORDER}`, background: "#fff", fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: 15, color: TEXT, cursor: "pointer", textAlign: "left" }}>{name}</button>)}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Bottom Nav ───────────────────────────────────────────
function BottomNav({ active, onChange }) {
  const tabs = [{ id: "home", label: "Home" }, { id: "player-standings", label: "Players", sublabel: "Standings" }, { id: "picks", label: "My Picks", big: true }, { id: "team-standings", label: "Team", sublabel: "Standings" }, { id: "schedule", label: "Schedule" }];
  const icon = (id, c) => {
    if (id === "home") return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>;
    if (id === "player-standings") return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>;
    if (id === "team-standings") return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 9h16M9 5v16"/></svg>;
    if (id === "schedule") return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>;
    return null;
  };
  return (
    <>
      <style>{`.bnav{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:480px;background:#fff;border-top:1px solid ${BORDER};display:flex;justify-content:space-around;align-items:flex-end;padding:0 4px;padding-bottom:max(8px,env(safe-area-inset-bottom));z-index:100}`}</style>
      <div className="bnav">
        {tabs.map(t => {
          const a = active === t.id, c = a ? BLUE : TEXT2;
          if (t.big) return (
            <button key={t.id} onClick={() => onChange(t.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "6px 0 4px", background: "none", border: "none", cursor: "pointer", minWidth: 64, marginTop: -8 }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", background: a ? BLUE : DARK, boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3" fill="rgba(255,255,255,0.15)"/><path d="M8 12l3 3 5-6"/></svg>
              </div>
              <span style={{ fontFamily: "'Geologica', sans-serif", fontWeight: 800, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 3, color: a ? BLUE : DARK }}>My Picks</span>
              {a && <div style={{ width: 4, height: 4, borderRadius: "50%", background: BLUE, marginTop: 2 }}/>}
            </button>
          );
          return (
            <button key={t.id} onClick={() => onChange(t.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 0 4px", background: "none", border: "none", cursor: "pointer", minWidth: 56 }}>
              {icon(t.id, c)}
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, marginTop: 3, color: c, fontWeight: a ? 600 : 500 }}>{t.label}</span>
              {t.sublabel && <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: c }}>{t.sublabel}</span>}
              {a && <div style={{ width: 4, height: 4, borderRadius: "50%", background: BLUE, marginTop: 2 }}/>}
            </button>
          );
        })}
      </div>
    </>
  );
}

// ── Main App ─────────────────────────────────────────────
export default function App() {
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem("f1_user") || null);
  const [activePage, setActivePage] = useState("home");
  const handleSelectName = (name) => { localStorage.setItem("f1_user", name); setCurrentUser(name); };
  const handleChangeName = () => { localStorage.removeItem("f1_user"); setCurrentUser(null); };

  if (!currentUser) return <WelcomeScreen onSelect={handleSelectName} />;

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Geologica:wght@300;400;700;900&family=DM+Sans:wght@300;400;500;600;700&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; } body { background: ${BG}; } .app-wrap { max-width: 480px; margin: 0 auto; min-height: 100vh; background: ${BG}; padding-bottom: 80px; }`}</style>
      <div className="app-wrap">
        <div style={{ padding: "14px 20px 10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src={LOGO_B64} alt="Formula 5" style={{ height: 85, objectFit: "contain" }} />
        </div>
        {activePage === "home" && <HomePage currentUser={currentUser} onNavigate={setActivePage} onChangeName={handleChangeName} />}
        {activePage === "player-standings" && <PlayerStandings currentUser={currentUser} />}
        {activePage === "picks" && <MyPicksPage currentUser={currentUser} onNavigate={setActivePage} />}
        {activePage === "team-standings" && <TeamStandings currentUser={currentUser} />}
        {activePage === "schedule" && <Schedule currentUser={currentUser} />}
        {activePage === "rules" && <Rules />}
        {activePage === "admin" && <Admin />}
        {activePage === "results" && <RaceResults currentUser={currentUser} />}
        {activePage === "strategy" && <Strategy />}
        {activePage === "f1-calendar" && <F1Calendar />}
        {activePage === "players" && <Players currentUser={currentUser} />}
        {activePage === "practice" && <PracticePicks />}
      </div>
      <BottomNav active={activePage} onChange={setActivePage} />
    </>
  );
}
