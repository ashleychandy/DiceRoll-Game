import { useContext, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import "../assets/Account.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { xrc20ABI } from "@/utils/XRC20ABI";
import Web3 from "web3";
import { diceContractAbi } from "@/utils/diceContractAbi";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import toast from "react-hot-toast";
import { FourSquare } from "react-loading-indicators";
import { MyBalanceContext } from "./BalanceContext";
import Dice from "./Dice";
import { NavLink } from "react-router-dom";
import Tweet from "./Tweet";

interface ResultDto {
  0: bigint | number;
  1: bigint | number;
  2: bigint | number;
  3: boolean;
  amount: bigint | number;
  number: bigint | number;
  rolledNumber: bigint | number;
  won: boolean;
  __length__: number;
}

export function Account() {
  const [diceNumber, setDiceNumber] = useState<number>(1);
  const [inputBalance, setInputBalance] = useState<string>("");
  const [balanceReplica, setBalanceReplica] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [isUserResultLoader, setIsUserResultLoader] = useState<boolean>(false);
  const [isUserWon, setIsUserWon] = useState<boolean>(false);
  const [resultText, setResultText] = useState<string>("");
  const [transactionHash, setTransactionHash] = useState<string>("");
  const [formattedTransactionHash, setFormattedTransactionHash] =
    useState<string>("");
  const [result, setResult] = useState<ResultDto>();
  const [diceFace, setDiceFace] = useState<number>(1);

  const context = useContext(MyBalanceContext);
  const balance = context?.balance;
  const setBalance = context?.setBalance;
  const gamaSymbol = context?.gamaSymbol;
  const address = context?.address;
  const chainId = context?.chainId;
  const minBet = context?.minBet;
  const rewardValue = context?.rewardValue;

  let interval: NodeJS.Timeout;
  const diceValue = ["1", "2", "3", "4", "5", "6"];

  const message = `🚀 Just scored BIG! I won ${
    Number(balanceReplica) * rewardValue!
  } ${gamaSymbol} tokens on ${window.location.href} 🌟
Dive in and try your luck, you could be the next big winner! 🏆 #WinningStreak #CryptoRewards`;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    setIsLoading(true);
    e.preventDefault();
    try {
      const formData = new FormData(e.currentTarget);
      const formValues = Object.fromEntries(formData.entries());
      const web3 = new Web3(window.web3);

      const testnetContractAddress =
        chainId === 51
          ? import.meta.env.VITE_XDC_TESTNET_CONTRACT_ADDRESS!
          : import.meta.env.VITE_XDC_MAINNET_CONTRACT_ADDRESS!;

      const tokenContract = new web3.eth.Contract(
        xrc20ABI,
        testnetContractAddress
      );

      const valueInWei = web3.utils.toWei(
        formValues.balance as string,
        "ether"
      );

      const gasPrice = await web3.eth.getGasPrice();

      const testNetDiceAddress =
        chainId === 51
          ? import.meta.env.VITE_XDC_TESTNET_DICE_CONTRACT_ADDRESS!
          : import.meta.env.VITE_XDC_MAINNET_DICE_CONTRACT_ADDRESS!;

      const approveGasEstimate = await tokenContract.methods
        .approve(testNetDiceAddress, valueInWei)
        .estimateGas({ from: address });

      const approveGasLimit = Math.ceil(
        Number(approveGasEstimate) * 1.5
      ).toString();

      await tokenContract.methods
        .approve(testNetDiceAddress, valueInWei)
        .send({
          from: address,
          gasPrice: gasPrice.toString(),
          gas: approveGasLimit,
        })
        .on("receipt", async () => {
          const diceContract = new web3.eth.Contract(
            diceContractAbi,
            testNetDiceAddress
          );

          const betGasEstimate = await diceContract.methods
            .placeBet(diceNumber, valueInWei)
            .estimateGas({ from: address });

          const betGasLimit = Math.ceil(
            Number(betGasEstimate) * 1.5
          ).toString();

          const sendBet = diceContract.methods
            .placeBet(diceNumber, valueInWei)
            .send({
              from: address,
              gasPrice: gasPrice.toString(),
              gas: betGasLimit,
            });

          sendBet
            .on("transactionHash", () => {
              setIsLoading(false);
              rollDice();
            })
            .on("receipt", async (txs) => {
              console.log("txs", txs);

              const formattedTransaction = formatTransaction(
                txs.transactionHash
              );
              setFormattedTransactionHash(formattedTransaction!);
              setTransactionHash(txs.transactionHash);
              const finalResult: ResultDto = await diceContract.methods
                .lastBetResults(address)
                .call();

              if (finalResult) {
                setResult(finalResult);
                const diceNo = Number(finalResult.rolledNumber);
                stopDiceRoll(diceNo, finalResult.won);
              }
            })
            .catch((error: unknown) => {
              if (error instanceof Error) {
                console.log("Error occurred in placeBet:", error);
                setIsLoading(false);
                toast.error(error.message);
              }
            });
        })
        .catch((error: unknown) => {
          if (error instanceof Error) {
            console.log("Error occurred in approve transaction:", error);
            setIsLoading(false);
            toast.error(error.message);
          }
        });
      setDiceNumber(1);
      setInputBalance("");
    } catch (error) {
      if (error instanceof Error) {
        console.log("error", error);
        setIsLoading(false);
        toast.error(error.message);
      }
    }
  };

  const rollDice = () => {
    setIsRolling(true);
    const faces = 6;
    interval = setInterval(() => {
      setDiceFace(Math.floor(Math.random() * faces) + 1);
    }, 200);
  };

  const stopDiceRoll = (finalResult: number, isWin: boolean) => {
    clearInterval(interval);
    setDiceFace(finalResult);
    setTimeout(() => {
      setIsRolling(false);
      setIsUserResultLoader(true);
      setIsUserWon(isWin);
      const parsedNumber = parseFloat(balance!);

      if (isWin) {
        setBalance!(
          (parsedNumber + Number(balanceReplica) * rewardValue!).toString()
        );
        setResultText("Congratulations, You've Won");
      } else {
        setBalance!((parsedNumber - Number(balanceReplica)).toString());
        setResultText("Oops, You've Lost");
      }
    }, 2000);
  };

  function formatTransaction(transaction?: string) {
    if (!transaction) return null;
    return `${transaction.slice(0, 8)}…${transaction.slice(58, 66)}`;
  }

  useEffect(() => {
    if (!isRolling) {
      clearInterval(interval);
    }
  }, [isRolling]);

  return (
    <>
      {isUserResultLoader && (
        <Dialog
          open={isUserResultLoader}
          onOpenChange={() => setIsUserResultLoader(!isUserResultLoader)}
        >
          <DialogContent className="sm:max-w-[425px] gap-0">
            <DialogTitle className="mb-3">{resultText}</DialogTitle>
            <div className="flex items-center gap-1 mb-2">
              <Label htmlFor="name">Your transaction hash:</Label>
              <div className="mt-0">
                <NavLink
                  style={{ color: "#0000EE", textDecoration: "underline" }}
                  to={`${
                    chainId === 50
                      ? `https://xdcscan.com/tx/${transactionHash}`
                      : `https://testnet.xdcscan.com/tx/${transactionHash}`
                  }`}
                  target="_blank"
                >
                  {formattedTransactionHash}
                </NavLink>
              </div>
            </div>
            <div className="flex items-center gap-1 mb-2">
              <Label htmlFor="name">Your bet amount:</Label>
              <div className="mt-0">
                {balanceReplica} {gamaSymbol}
              </div>
            </div>
            <div className="flex items-center gap-1 mb-2">
              <Label htmlFor="name">{`Your ${
                isUserWon ? "winning" : "loosing"
              } amount:`}</Label>
              <div className="mt-0">
                {isUserWon
                  ? Number(balanceReplica) * rewardValue!
                  : balanceReplica}{" "}
                {gamaSymbol}
              </div>
            </div>
            <div className="flex items-center gap-1 mb-2">
              <Label htmlFor="name">Your selected number:</Label>
              <div className="mt-0">{Number(result?.number)}</div>
            </div>
            <div className="flex items-center gap-1">
              <Label htmlFor="name">Final rolled number:</Label>
              <div className="mt-0">{Number(result?.rolledNumber)}</div>
            </div>
            {isUserWon && <Tweet content={message} />}
          </DialogContent>
        </Dialog>
      )}
      {isLoading && (
        <div className="overlay">
          <div className="loader">
            <FourSquare color="#fff" size="medium" text="" textColor="" />
          </div>
        </div>
      )}
      <div className="flex-grow flex flex-col justify-center items-center">
        {isRolling ? (
          <Dice diceFace={diceFace} />
        ) : (
          <Card className="w-[350px]">
            <CardHeader>
              <CardTitle>Roll The Dice</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <div className="grid w-full items-center gap-4">
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="framework">
                      Select your Dice number (1 to 6):
                    </Label>
                    <Select
                      name="dice"
                      value={String(diceNumber)}
                      onValueChange={(e) => setDiceNumber(Number(e))}
                    >
                      <SelectTrigger id="framework">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {diceValue.map((val, ind) => {
                          return (
                            <SelectItem key={ind} value={val}>
                              {val}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="balance">Enter balance (GAMA Token):</Label>
                    <div className="flex w-full max-w-sm items-center space-x-2 relative">
                      <Input
                        type="text"
                        required
                        pattern="[0-9]*"
                        inputMode="numeric"
                        name="balance"
                        id="balance"
                        className="relative"
                        value={inputBalance}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (/^\d*$/.test(value)) {
                            setInputBalance(value);
                            setBalanceReplica(value);
                          }
                        }}
                        placeholder="Enter balance"
                      />
                      <Button
                        type="button"
                        onClick={() => {
                          setInputBalance(balance!);
                          setBalanceReplica(balance!);
                        }}
                        className="absolute left-auto right-0 rounded-tl-none rounded-bl-none"
                      >
                        Add Max
                      </Button>
                    </div>
                    <Label htmlFor="balance" className="leading-5">
                      If your guess is correct, you’ll receive 5x the tokens you
                      wagered. If not, your tokens will be burned. Good luck!
                    </Label>
                  </div>
                  <div className="flex justify-center">
                    <Button
                      type="submit"
                      disabled={
                        Number(inputBalance)! > Number(parseFloat(balance!)) ||
                        minBet! > Number(inputBalance)
                      }
                    >
                      Roll
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
